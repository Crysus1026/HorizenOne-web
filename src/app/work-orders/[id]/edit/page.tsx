"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  getSchedulingWindowId,
  getWeekdayFromDate,
} from "@/lib/scheduling";

type WorkOrder = {
  workOrderNumber?: string;
  companyId: string;
  companyName?: string;
  projectId?: string;
  projectName?: string;
  deviceTypeId?: string;
  deviceTypeName?: string;
  completionFormTemplateId?: string;
  completionFormTemplateName?: string;
  customerId: string;
  customerName: string;
  serviceTypeId: string;
  serviceTypeName: string;
  serviceDurationMinutes: number;
  scheduledDate: string;
  timeWindow: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  status: string;
  notes?: string;
  isActive: boolean;
};

type Technician = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  employeeId?: string;
  companyId?: string;
  projectIds?: string[];
  role?: string;
  isActive?: boolean;
};

type TechnicianAvailability = {
  technicianId: string;
  weeklySchedule: Record<string, string[]>;
};

type Project = {
  id: string;
  companyId?: string;
  companyName?: string;
  name?: string;
  projectCode?: string;
  isActive?: boolean;
};

type DeviceType = {
  id: string;
  companyId?: string;
  companyName?: string;
  projectId?: string;
  projectName?: string;
  name?: string;
  deviceCode?: string;
  isActive?: boolean;
};

type CompletionFormTemplate = {
  id: string;
  companyId?: string;
  companyName?: string;
  projectId?: string;
  projectName?: string;
  serviceTypeId?: string;
  serviceTypeName?: string;
  deviceTypeId?: string;
  deviceTypeName?: string;
  name?: string;
  isActive?: boolean;
};

export default function EditWorkOrderPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const workOrderId = params.id as string;
  const isAssignMode = searchParams.get("assignTechnician") === "true";

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [scheduledDate, setScheduledDate] = useState("");
  const [timeWindow, setTimeWindow] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTechnicianId, setAssignedTechnicianId] = useState("");
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const [technicianConflicts, setTechnicianConflicts] =
    useState<Record<string, string>>({});

  const [projects, setProjects] = useState<Project[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [completionTemplates, setCompletionTemplates] = useState<
    CompletionFormTemplate[]
  >([]);

  const [projectId, setProjectId] = useState("");
  const [deviceTypeId, setDeviceTypeId] = useState("");

  const eligibleTechnicians = technicians.filter((technician) => {
    if (!projectId) {
      return false;
    }

    return (
      Array.isArray(technician.projectIds) &&
      technician.projectIds.includes(projectId)
    );
  });

  const filteredDeviceTypes = deviceTypes.filter(
    (deviceType) => deviceType.isActive !== false
  );

  const selectedCompletionTemplate = completionTemplates.find(
    (template) =>
      template.isActive !== false &&
      template.projectId === projectId &&
      template.serviceTypeId === workOrder?.serviceTypeId &&
      template.deviceTypeId === deviceTypeId
  );

  useEffect(() => {
  async function loadTechnicians(companyId: string) {
    const techniciansQuery = query(
      collection(db, "users"),
      where("role", "==", "Technician"),
      where("isActive", "==", true),
      where("companyId", "==", companyId)
    );

    const snap = await getDocs(techniciansQuery);

    const loadedTechnicians: Technician[] = snap.docs.map((document) => ({
      id: document.id,
      ...(document.data() as Omit<Technician, "id">),
    }));

    setTechnicians(loadedTechnicians);
  }

  async function loadWorkOrder() {
    if (!workOrderId) {
      setLoading(false);
      return;
    }

    try {
      const ref = doc(db, "workOrders", workOrderId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setWorkOrder(null);
        return;
      }

      const data = snap.data() as WorkOrder;

      setWorkOrder(data);
      setScheduledDate(data.scheduledDate || "");
      setTimeWindow(data.timeWindow || "");
      setNotes(data.notes || "");
      setAssignedTechnicianId(data.assignedTechnicianId || "");
      setProjectId(data.projectId || "");
      setDeviceTypeId(data.deviceTypeId || "");

      await loadTechnicians(data.companyId);
    } catch (error) {
      console.error("Error loading work order:", error);
    } finally {
      setLoading(false);
    }
  }

  loadWorkOrder();
  loadAdminOptions();
}, [workOrderId]);

useEffect(() => {
  if (
    !scheduledDate ||
    !timeWindow ||
    technicians.length === 0 ||
    !workOrder
  ) {
    setTechnicianConflicts({});
    return;
  }

  evaluateTechnicianAvailability(
    scheduledDate,
    timeWindow
  );
}, [
  scheduledDate,
  timeWindow,
  technicians,
  workOrder,
  workOrderId,
]);

  async function loadAdminOptions() {
  const projectsQuery = query(
    collection(db, "projects"),
    where("isActive", "==", true),
    orderBy("name", "asc")
  );

  const deviceTypesQuery = query(
    collection(db, "deviceTypes"),
    where("isActive", "==", true),
    orderBy("name", "asc")
  );

  const templatesQuery = query(
    collection(db, "completionFormTemplates"),
    where("isActive", "==", true),
    orderBy("name", "asc")
  );

  const [projectsSnapshot, deviceTypesSnapshot, templatesSnapshot] =
    await Promise.all([
      getDocs(projectsQuery),
      getDocs(deviceTypesQuery),
      getDocs(templatesQuery),
    ]);

  setProjects(
    projectsSnapshot.docs.map((document) => ({
      id: document.id,
      ...(document.data() as Omit<Project, "id">),
    }))
  );

  setDeviceTypes(
    deviceTypesSnapshot.docs.map((document) => ({
      id: document.id,
      ...(document.data() as Omit<DeviceType, "id">),
    }))
  );

  setCompletionTemplates(
    templatesSnapshot.docs.map((document) => ({
      id: document.id,
      ...(document.data() as Omit<CompletionFormTemplate, "id">),
    }))
  );
}

async function evaluateTechnicianAvailability(
  selectedDate: string,
  selectedWindow: string
) {
  if (!selectedDate || !selectedWindow) {
    setTechnicianConflicts({});
    return;
  }

  try {
    const weekday = getWeekdayFromDate(selectedDate);
    const schedulingWindowId =
      getSchedulingWindowId(selectedWindow);

    if (!weekday || !schedulingWindowId) {
      setTechnicianConflicts({});
      return;
    }

    if (!workOrder?.companyId) {
      setTechnicianConflicts({});
      return;
    }

    const availabilityQuery = query(
      collection(db, "technicianAvailability"),
      where("companyId", "==", workOrder.companyId)
    );

    const availabilitySnapshot = await getDocs(
      availabilityQuery
    );

    const availabilityRecords: Record<
      string,
      TechnicianAvailability
    > = {};

    availabilitySnapshot.forEach((availabilityDocument) => {
      const data =
        availabilityDocument.data() as TechnicianAvailability;

      availabilityRecords[data.technicianId] = data;
    });

    const conflicts: Record<string, string> = {};

    eligibleTechnicians.forEach((technician) => {
      const availability =
        availabilityRecords[technician.id];

      if (!availability) {
        conflicts[technician.id] =
          "Availability not configured";
        return;
      }

      const scheduledWindows =
        availability.weeklySchedule?.[weekday] ?? [];

      if (!scheduledWindows.includes(schedulingWindowId)) {
        conflicts[technician.id] =
          `Not available ${weekday}`;
      }
    });

    const workOrdersQuery = query(
      collection(db, "workOrders"),
      where("companyId", "==", workOrder.companyId),
      where("scheduledDate", "==", selectedDate),
      where("timeWindow", "==", selectedWindow)
    );

    const workOrdersSnapshot =
      await getDocs(workOrdersQuery);

    workOrdersSnapshot.forEach((workOrderDocument) => {
      if (workOrderDocument.id === workOrderId) {
        return;
      }

      const data = workOrderDocument.data();

      const blockingStatuses = [
        "Scheduled",
        "Appointment Confirmed",
        "Assigned",
        "Completed",
        "Verified",
      ];

      if (data.isActive === false) {
        return;
      }

      if (!blockingStatuses.includes(data.status)) {
        return;
      }

      if (data.assignedTechnicianId) {
        conflicts[data.assignedTechnicianId] =
          "Already assigned";
      }
    });

    setTechnicianConflicts(conflicts);
  } catch (error) {
    console.error(
      "Unable to evaluate technician availability:",
      error
    );
  }
}

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();

  if (!workOrder) return;

  if (!scheduledDate.trim()) {
    alert("Scheduled date is required.");
    return;
  }

  if (!timeWindow.trim()) {
    alert("Time window is required.");
    return;
  }

  setSaving(true);

  try {
    const ref = doc(db, "workOrders", workOrderId);

    const selectedTechnician = eligibleTechnicians.find(
      (technician) => technician.id === assignedTechnicianId
    );

    if (
      assignedTechnicianId &&
      technicianConflicts[assignedTechnicianId]
    ) {
      alert(
        `This technician cannot be assigned: ${
          technicianConflicts[assignedTechnicianId]
        }.`
      );

      setSaving(false);
      return;
    }

    const selectedProject = projects.find((project) => project.id === projectId);

    const selectedDeviceType = deviceTypes.find(
      (deviceType) => deviceType.id === deviceTypeId
    );

    const technicianName = selectedTechnician
      ? selectedTechnician.name ||
        `${selectedTechnician.firstName || ""} ${
          selectedTechnician.lastName || ""
        }`.trim() ||
        selectedTechnician.email ||
        ""
      : "";

if (!selectedProject) {
  alert("Project is required.");
  setSaving(false);
  return;
}

if (!selectedDeviceType) {
  alert("Device type is required.");
  setSaving(false);
  return;
}

if (!selectedCompletionTemplate) {
  alert(
    "No active completion template was found for this project, service type, and device type."
  );
  setSaving(false);
  return;
}

    let newStatus = workOrder.status;

    if (workOrder.status !== "Verified" && workOrder.status !== "Closed") {
      newStatus =
        assignedTechnicianId.trim() !== "" ? "Assigned" : "Scheduled";
    }

    await updateDoc(ref, {
      companyId: selectedProject.companyId || workOrder.companyId,
      companyName: selectedProject.companyName || workOrder.companyName || "",

      projectId: selectedProject.id,
      projectName: selectedProject.name || "",

      deviceTypeId: selectedDeviceType.id,
      deviceTypeName: selectedDeviceType.name || "",

      completionFormTemplateId: selectedCompletionTemplate.id,
      completionFormTemplateName: selectedCompletionTemplate.name || "",
      
      scheduledDate,
      timeWindow,
      notes,
      assignedTechnicianId,
      assignedTechnicianName: technicianName,
      status: newStatus,
      updatedAt: serverTimestamp(),
    });

    router.push(`/work-orders/${workOrderId}`);
  } catch (error) {
    console.error("Error updating work order:", error);
    alert("Failed to update work order.");
  } finally {
    setSaving(false);
  }
}

  if (loading) {
    return <div className="p-6 text-white">Loading work order...</div>;
  }

  if (!workOrder) {
    return (
      <div className="p-6 text-white">
        <h1 className="text-2xl font-bold">Work Order Not Found</h1>

        <Link
          href="/work-orders"
          className="mt-4 inline-block text-blue-400 hover:text-blue-300"
        >
          Back to Work Orders
        </Link>
      </div>
    );
  }

  const displayWorkOrderNumber =
    workOrder.workOrderNumber || `WO-${workOrderId.slice(0, 8).toUpperCase()}`;

  return (
    <div className="p-6 text-white">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {isAssignMode ? "Assign Technician" : "Edit Work Order"}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {displayWorkOrderNumber}
          </p>
        </div>

        <Link
          href={`/work-orders/${workOrderId}`}
          className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
        >
          Cancel
        </Link>
      </div>

      <form
        onSubmit={handleSave}
        className="grid gap-6 lg:grid-cols-3"
      >
        <div className="rounded-xl border border-gray-800 bg-[#0B1220] p-5 lg:col-span-2">
          <h2 className="mb-4 text-xl font-semibold">Work Order Information</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <ReadOnlyField label="Customer" value={workOrder.customerName} />

<div>
  <label className="mb-2 block text-sm font-medium text-gray-400">
    Project
  </label>
  <select
    value={projectId}
    onChange={(e) => {
      setProjectId(e.target.value);
      setDeviceTypeId("");
      setAssignedTechnicianId("");
      setTechnicianConflicts({});
    }}
    className="w-full rounded-lg border border-gray-800 bg-[#070B12] px-3 py-2 text-white outline-none focus:border-blue-500"
  >
    <option value="">Select project</option>
    {projects.map((project) => (
      <option key={project.id} value={project.id}>
        {project.name || "Unnamed Project"}
      </option>
    ))}
  </select>
</div>

<ReadOnlyField label="Service Type" value={workOrder.serviceTypeName} />

<div>
  <label className="mb-2 block text-sm font-medium text-gray-400">
    Device Type
  </label>
  <select
    value={deviceTypeId}
    onChange={(e) => setDeviceTypeId(e.target.value)}
    className="w-full rounded-lg border border-gray-800 bg-[#070B12] px-3 py-2 text-white outline-none focus:border-blue-500"
  >
    <option value="">Select device type</option>
    {filteredDeviceTypes.map((deviceType) => (
      <option key={deviceType.id} value={deviceType.id}>
        {deviceType.name || "Unnamed Device Type"}
      </option>
    ))}
  </select>
</div>

<div className="md:col-span-2 rounded-lg border border-gray-800 bg-[#070B12] p-4">
  <p className="text-sm font-medium text-gray-400">
    Completion Template
  </p>

  {projectId && workOrder.serviceTypeId && deviceTypeId ? (
    selectedCompletionTemplate ? (
      <p className="mt-2 text-sm text-cyan-300">
        {selectedCompletionTemplate.name}
      </p>
    ) : (
      <p className="mt-2 text-sm text-red-300">
        No active completion template found for this combination.
      </p>
    )
  ) : (
    <p className="mt-2 text-sm text-gray-500">
      Select project and device type to match a completion template.
    </p>
  )}
</div>

<ReadOnlyField
  label="Duration"
  value={`${workOrder.serviceDurationMinutes} minutes`}
/>

<ReadOnlyField label="Current Status" value={workOrder.status} />

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-400">
                Scheduled Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-lg border border-gray-800 bg-[#070B12] px-3 py-2 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-400">
                Time Window
              </label>
              <select
                value={timeWindow}
                onChange={(e) => setTimeWindow(e.target.value)}
                className="w-full rounded-lg border border-gray-800 bg-[#070B12] px-3 py-2 text-white outline-none focus:border-blue-500"
              >
                <option value="">Select time window</option>
                <option value="8:00 AM - 10:00 AM">8:00 AM - 10:00 AM</option>
                <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM</option>
                <option value="12:00 PM - 2:00 PM">12:00 PM - 2:00 PM</option>
                <option value="2:00 PM - 4:00 PM">2:00 PM - 4:00 PM</option>
              </select>
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-gray-800 bg-[#070B12] px-3 py-2 text-white outline-none focus:border-blue-500"
              placeholder="Add work order notes..."
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-[#0B1220] p-5">
          <h2 className="mb-4 text-xl font-semibold">Technician Assignment</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-400">
                Assigned Technician
              </label>

              <select
                value={assignedTechnicianId}
                onChange={(e) => {
                  setAssignedTechnicianId(e.target.value);
                }}
                className="w-full rounded-lg border border-gray-800 bg-[#070B12] px-3 py-2 text-white outline-none focus:border-blue-500"
              >
                <option value="">Unassigned</option>

                {eligibleTechnicians.map((technician) => {
                  const conflict =
                    technicianConflicts[technician.id];

                  const technicianName =
                    technician.name ||
                    `${technician.firstName || ""} ${
                      technician.lastName || ""
                    }`.trim() ||
                    technician.email ||
                    technician.id;

                  const technicianLabel = technician.employeeId
                    ? `${technician.employeeId} - ${technicianName}`
                    : technicianName;

                  return (
                    <option
                      key={technician.id}
                      value={technician.id}
                      disabled={Boolean(conflict)}
                    >
                      {technicianLabel}
                      {conflict
                        ? ` — ${conflict}`
                        : " — Available"}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="rounded-lg border border-gray-800 bg-[#070B12] p-4 text-sm text-gray-400">
              Selecting a technician will move this work order to Assigned when saved.
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Work Order"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-400">{label}</p>
      <div className="rounded-lg border border-gray-800 bg-[#070B12] px-3 py-2 text-gray-200">
        {value}
      </div>
    </div>
  );
}