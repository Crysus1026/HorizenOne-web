import { adminDb } from "@/lib/firebaseAdmin";
import {
  getSchedulingWindowId,
  getWeekdayFromDate,
} from "@/lib/scheduling";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIME_WINDOWS = [
  "8:00 AM - 10:00 AM",
  "10:00 AM - 12:00 PM",
  "12:00 PM - 2:00 PM",
  "2:00 PM - 4:00 PM",
] as const;

const BLOCKING_STATUSES = [
  "Scheduled",
  "Appointment Confirmed",
  "Assigned",
  "Completed",
  "Verified",
];

type TechnicianRecord = {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  companyId?: string;
  projectIds?: string[];
  role?: string;
  isActive?: boolean;
};

type AvailabilityRecord = {
  technicianId?: string;
  companyId?: string;
  projectIds?: string[];
  weeklySchedule?: Record<string, string[]>;
};

type WorkOrderRecord = {
  companyId?: string;
  projectId?: string;
  scheduledDate?: string;
  timeWindow?: string;
  assignedTechnicianId?: string;
  status?: string;
  isActive?: boolean;
  customerScheduleToken?: string;
  customerScheduleTokenUsed?: boolean;
};

function technicianBelongsToProject(
  technician: TechnicianRecord,
  projectId: string
): boolean {
  if (!projectId) {
    return false;
  }

  if (!Array.isArray(technician.projectIds)) {
    return false;
  }

  return technician.projectIds.includes(projectId);
}

  /*
   * An empty projectIds array currently means that the technician
   * is not restricted to a specific project.
   *
   * Change this to `return false` if every technician must be
   * explicitly assigned to a project.
   */
  if (
    !Array.isArray(technician.projectIds) ||
    technician.projectIds.length === 0
  ) {
    return true;
  }

  return technician.projectIds.includes(projectId);
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")?.trim();
    const date = request.nextUrl.searchParams.get("date")?.trim();

    if (!token) {
      return NextResponse.json(
        {
          error: "The customer scheduling token is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!date) {
      return NextResponse.json(
        {
          error: "The requested installation date is required.",
        },
        {
          status: 400,
        }
      );
    }

    const weekday = getWeekdayFromDate(date);

    if (!weekday) {
      return NextResponse.json(
        {
          error: "The requested installation date is invalid.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Locate the work order using the private scheduling token.
     */

    const workOrderSnapshot = await adminDb
      .collection("workOrders")
      .where("customerScheduleToken", "==", token)
      .limit(1)
      .get();

    if (workOrderSnapshot.empty) {
      return NextResponse.json(
        {
          error: "This customer confirmation link is invalid.",
        },
        {
          status: 404,
        }
      );
    }

    const workOrderDocument = workOrderSnapshot.docs[0];
    const workOrder =
      workOrderDocument.data() as WorkOrderRecord;

    if (workOrder.customerScheduleTokenUsed === true) {
      return NextResponse.json(
        {
          error: "This customer confirmation has already been completed.",
        },
        {
          status: 409,
        }
      );
    }

    if (!workOrder.companyId) {
      return NextResponse.json(
        {
          error: "The work order is missing company information.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Load active technicians for the work order's company.
     */

    const technicianSnapshot = await adminDb
      .collection("users")
      .where("companyId", "==", workOrder.companyId)
      .where("role", "==", "Technician")
      .where("isActive", "==", true)
      .get();

    const eligibleTechnicianIds = new Set<string>();

    technicianSnapshot.docs.forEach((technicianDocument) => {
      const technician =
        technicianDocument.data() as TechnicianRecord;

      if (
        technicianBelongsToProject(
          technician,
          workOrder.projectId || ""
        )
      ) {
        eligibleTechnicianIds.add(technicianDocument.id);
      }
    });

    if (eligibleTechnicianIds.size === 0) {
      return NextResponse.json({
        availableWindows: [],
      });
    }

    /*
     * Load weekly availability for this company.
     */

    const availabilitySnapshot = await adminDb
      .collection("technicianAvailability")
      .where("companyId", "==", workOrder.companyId)
      .get();

    const availabilityByTechnician = new Map<
      string,
      AvailabilityRecord
    >();

    availabilitySnapshot.docs.forEach((availabilityDocument) => {
      const availability =
        availabilityDocument.data() as AvailabilityRecord;

      if (
        availability.technicianId &&
        eligibleTechnicianIds.has(availability.technicianId)
      ) {
        availabilityByTechnician.set(
          availability.technicianId,
          availability
        );
      }
    });

    /*
     * Load existing work orders for the requested date.
     */

    const existingWorkOrdersSnapshot = await adminDb
      .collection("workOrders")
      .where("companyId", "==", workOrder.companyId)
      .where("scheduledDate", "==", date)
      .get();

    const bookedTechniciansByWindow = new Map<
      string,
      Set<string>
    >();

    existingWorkOrdersSnapshot.docs.forEach(
      (existingWorkOrderDocument) => {
        if (
          existingWorkOrderDocument.id ===
          workOrderDocument.id
        ) {
          return;
        }

        const existingWorkOrder =
          existingWorkOrderDocument.data() as WorkOrderRecord;

        if (existingWorkOrder.isActive === false) {
          return;
        }

        if (
          !existingWorkOrder.status ||
          !BLOCKING_STATUSES.includes(
            existingWorkOrder.status
          )
        ) {
          return;
        }

        if (
          !existingWorkOrder.assignedTechnicianId ||
          !existingWorkOrder.timeWindow
        ) {
          return;
        }

        const bookedTechnicians =
          bookedTechniciansByWindow.get(
            existingWorkOrder.timeWindow
          ) ?? new Set<string>();

        bookedTechnicians.add(
          existingWorkOrder.assignedTechnicianId
        );

        bookedTechniciansByWindow.set(
          existingWorkOrder.timeWindow,
          bookedTechnicians
        );
      }
    );

    /*
     * A window is available when at least one eligible technician:
     *
     * 1. Has an availability document.
     * 2. Is scheduled for that weekday and time window.
     * 3. Is not already assigned during that window.
     */

    const availableWindows = TIME_WINDOWS.filter(
      (timeWindow) => {
        const schedulingWindowId =
          getSchedulingWindowId(timeWindow);

        if (!schedulingWindowId) {
          return false;
        }

        const bookedTechnicians =
          bookedTechniciansByWindow.get(timeWindow) ??
          new Set<string>();

        return Array.from(eligibleTechnicianIds).some(
          (technicianId) => {
            const availability =
              availabilityByTechnician.get(technicianId);

            if (!availability?.weeklySchedule) {
              return false;
            }

            const scheduledWindows =
              availability.weeklySchedule[weekday] ?? [];

            const isScheduled =
              scheduledWindows.includes(
                schedulingWindowId
              );

            const isAlreadyBooked =
              bookedTechnicians.has(technicianId);

            return isScheduled && !isAlreadyBooked;
          }
        );
      }
    );

    return NextResponse.json({
      availableWindows,
    });
  } catch (error) {
    console.error(
      "Unable to load customer scheduling availability:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load appointment availability.",
      },
      {
        status: 500,
      }
    );
  }
}