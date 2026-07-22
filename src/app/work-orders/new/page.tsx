"use client";

import AppShell from "@/components/AppShell";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  getSchedulingWindowId,
  getWeekdayFromDate,
} from "@/lib/scheduling";
import { useUserProfile } from "@/hooks/useUserProfile";

type Customer = {
  id: string;
  customerName: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
};

type ServiceType = {
  id: string;
  name: string;
  durationMinutes: number;
  isActive: boolean;
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

type Technician = {
  id: string;
  companyId?: string;
  projectIds?: string[];
  role?: string;
  isActive?: boolean;
};

type TechnicianAvailability = {
  technicianId: string;
  companyId?: string;
  weeklySchedule?: Record<string, string[]>;
};

type ExistingWorkOrder = {
  projectId?: string;
  assignedTechnicianId?: string;
  status?: string;
  isActive?: boolean;
};

function generateScheduleToken() {
  return crypto.randomUUID();
}

const BLOCKING_WORK_ORDER_STATUSES = [
  "Scheduled",
  "Appointment Confirmed",
  "Assigned",
  "Completed",
  "Verified",
];

const TIME_WINDOWS = [
  "8:00 AM - 10:00 AM",
  "10:00 AM - 12:00 PM",
  "12:00 PM - 2:00 PM",
  "2:00 PM - 4:00 PM",
] as const;

function NewWorkOrderPageContent() {
  const router = useRouter();

  const {
    profile,
    companyId,
    isSystemAdmin,
    isLoadingProfile,
    profileError,
  } = useUserProfile();

  const searchParams = useSearchParams();
  const customerIdFromUrl = searchParams.get("customerId");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [completionTemplates, setCompletionTemplates] = useState<
    CompletionFormTemplate[]
  >([]);

  const [customerId, setCustomerId] = useState("");
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [deviceTypeId, setDeviceTypeId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [timeWindow, setTimeWindow] = useState("");
  const [notes, setNotes] = useState("");

  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] =
    useState(false);

  const [hasAvailableTechnician, setHasAvailableTechnician] =
    useState<boolean | null>(null);

  const [availabilityMessage, setAvailabilityMessage] =
    useState("");

  const [timeWindowAvailability, setTimeWindowAvailability] =
    useState<Record<string, boolean>>({});  

  const [error, setError] = useState("");

  const filteredDeviceTypes = deviceTypes.filter(
    (deviceType) =>
      deviceType.isActive !== false &&
      (!projectId || deviceType.projectId === projectId)
  );

  const selectedCompletionTemplate = completionTemplates.find(
    (template) =>
      template.isActive !== false &&
      template.projectId === projectId &&
      template.serviceTypeId === serviceTypeId &&
      template.deviceTypeId === deviceTypeId
  );

  useEffect(() => {
    if (isLoadingProfile) return;

    if (profileError) {
      setError(profileError);
      setIsLoadingOptions(false);
      return;
    }

    if (!profile) {
      setError("Unable to load user profile.");
      setIsLoadingOptions(false);
      return;
    }

    if (!isSystemAdmin && !companyId) {
      setError("Your user account is missing a company assignment.");
      setIsLoadingOptions(false);
      return;
    }

    const currentProfile = profile;

    async function loadOptions() {
      try {
        setIsLoadingOptions(true);
        setError("");

        const customersQuery = isSystemAdmin
          ? query(
              collection(db, "customers"),
              where("isActive", "==", true),
              orderBy("customerName", "asc")
            )
          : query(
              collection(db, "customers"),
              where("companyId", "==", companyId),
              where("isActive", "==", true),
              orderBy("customerName", "asc")
            );

        const serviceTypesQuery = isSystemAdmin
          ? query(
              collection(db, "serviceTypes"),
              where("isActive", "==", true),
              orderBy("name", "asc")
            )
          : query(
              collection(db, "serviceTypes"),
              where("companyId", "==", companyId),
              where("isActive", "==", true),
              orderBy("name", "asc")
            );

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

        const [
          customersSnapshot,
          serviceTypesSnapshot,
          projectsSnapshot,
          deviceTypesSnapshot,
          templatesSnapshot,
        ] = await Promise.all([
          getDocs(customersQuery),
          getDocs(serviceTypesQuery),
          getDocs(projectsQuery),
          getDocs(deviceTypesQuery),
          getDocs(templatesQuery),
        ]);

        const loadedProjects = projectsSnapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        })) as Project[];

        const allowedProjects =
          isSystemAdmin || currentProfile.role === "Admin"
            ? loadedProjects.filter(
                (project) =>
                  isSystemAdmin || project.companyId === companyId
              )
            : loadedProjects.filter(
                (project) =>
                  project.companyId === companyId &&
                  currentProfile.projectIds.includes(project.id)
              );

        const allowedProjectIds = new Set(
          allowedProjects.map((project) => project.id)
        );

        setCustomers(
          customersSnapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          })) as Customer[]
        );

        setServiceTypes(
          serviceTypesSnapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          })) as ServiceType[]
        );

        setProjects(allowedProjects);

        setDeviceTypes(
          deviceTypesSnapshot.docs
            .map((document) => ({
              id: document.id,
              ...document.data(),
            }))
            .filter((deviceType) =>
              allowedProjectIds.has(
                (deviceType as DeviceType).projectId || ""
              )
            ) as DeviceType[]
        );

        setCompletionTemplates(
          templatesSnapshot.docs
            .map((document) => ({
              id: document.id,
              ...document.data(),
            }))
            .filter((template) =>
              allowedProjectIds.has(
                (template as CompletionFormTemplate).projectId || ""
              )
            ) as CompletionFormTemplate[]
        );
      } catch (err: unknown) {
        console.error("Unable to load work-order options:", err);

        setError(
          err instanceof Error
            ? `Unable to load form options: ${err.message}`
            : "Unable to load form options."
        );
      } finally {
        setIsLoadingOptions(false);
      }
    }

    void loadOptions();
  }, [
    profile,
    companyId,
    isSystemAdmin,
    isLoadingProfile,
    profileError,
  ]);

  useEffect(() => {
  if (!customerIdFromUrl || customers.length === 0) return;

  const selectedCustomer = customers.find(
    (customer) => customer.id === customerIdFromUrl
  );

  if (!selectedCustomer) return;

  setCustomerId(selectedCustomer.id);
}, [customerIdFromUrl, customers]);

  async function checkTechnicianAvailability(
    selectedProjectId: string,
    selectedDate: string,
    selectedTimeWindow: string,
    updateUi = true
  ): Promise<boolean> {
    if (
      !selectedProjectId ||
      !selectedDate ||
      !selectedTimeWindow
    ) {
      if (updateUi) {
        setHasAvailableTechnician(null);
        setAvailabilityMessage("");
      }

      return false;
    }

    const selectedProject = projects.find(
      (project) => project.id === selectedProjectId
    );

    if (!selectedProject?.companyId) {
      if (updateUi) {
        setHasAvailableTechnician(false);
        setAvailabilityMessage(
          "The selected project is missing company information."
        );
      }

      return false;
    }

    const weekday = getWeekdayFromDate(selectedDate);
    const schedulingWindowId =
      getSchedulingWindowId(selectedTimeWindow);

    if (!weekday || !schedulingWindowId) {
      if (updateUi) {
        setHasAvailableTechnician(false);
        setAvailabilityMessage(
          "The selected date or time window is invalid."
        );
      }

      return false;
    }

    try {
      if (updateUi) {
        setIsCheckingAvailability(true);
        setAvailabilityMessage("");
      }

      /*
      * Load technicians assigned to this company.
      */

      const techniciansQuery = query(
        collection(db, "users"),
        where("companyId", "==", selectedProject.companyId),
        where("role", "==", "Technician"),
        where("isActive", "==", true)
      );

      const techniciansSnapshot = await getDocs(
        techniciansQuery
      );

      const eligibleTechnicians: Technician[] =
        techniciansSnapshot.docs
          .map((technicianDocument) => ({
            id: technicianDocument.id,
            ...(technicianDocument.data() as Omit<
              Technician,
              "id"
            >),
          }))
          .filter(
            (technician) =>
              Array.isArray(technician.projectIds) &&
              technician.projectIds.includes(selectedProjectId)
          );

      if (eligibleTechnicians.length === 0) {
        if (updateUi) {
          setHasAvailableTechnician(false);
          setAvailabilityMessage(
            "No active technicians are assigned to this program."
          );
        }
        return false;
      }

      const eligibleTechnicianIds = new Set(
        eligibleTechnicians.map(
          (technician) => technician.id
        )
      );

      /*
      * Load recurring weekly schedules.
      */

      const availabilityQuery = query(
        collection(db, "technicianAvailability"),
        where("companyId", "==", selectedProject.companyId)
      );

      const availabilitySnapshot = await getDocs(
        availabilityQuery
      );

      const scheduledTechnicianIds = new Set<string>();

      availabilitySnapshot.docs.forEach(
        (availabilityDocument) => {
          const availability =
            availabilityDocument.data() as TechnicianAvailability;

          if (
            !availability.technicianId ||
            !eligibleTechnicianIds.has(
              availability.technicianId
            )
          ) {
            return;
          }

          const scheduledWindows =
            availability.weeklySchedule?.[weekday] ?? [];

          if (
            scheduledWindows.includes(schedulingWindowId)
          ) {
            scheduledTechnicianIds.add(
              availability.technicianId
            );
          }
        }
      );

      if (scheduledTechnicianIds.size === 0) {
        if (updateUi) {
          setHasAvailableTechnician(false);
          setAvailabilityMessage(
            "No technicians assigned to this program are scheduled to work during this time window."
          );
        }
        return false;
      }

      /*
      * Find technicians already assigned to another work order
      * during the selected slot.
      */

      const existingWorkOrdersQuery = query(
        collection(db, "workOrders"),
        where("companyId", "==", selectedProject.companyId),
        where("scheduledDate", "==", selectedDate),
        where("timeWindow", "==", selectedTimeWindow)
      );

      const existingWorkOrdersSnapshot = await getDocs(
        existingWorkOrdersQuery
      );

      const bookedTechnicianIds = new Set<string>();
let unassignedWorkOrderCount = 0;

existingWorkOrdersSnapshot.docs.forEach(
  (workOrderDocument) => {
    const existingWorkOrder =
      workOrderDocument.data() as ExistingWorkOrder;

    if (existingWorkOrder.isActive === false) {
      return;
    }

    if (
      !existingWorkOrder.status ||
      !BLOCKING_WORK_ORDER_STATUSES.includes(
        existingWorkOrder.status
      )
    ) {
      return;
    }

    /*
     * Work orders from another program do not consume this
     * program's unassigned capacity.
     */
    if (
      existingWorkOrder.projectId !== selectedProjectId
    ) {
      return;
    }

    if (existingWorkOrder.assignedTechnicianId) {
      /*
       * Count the technician only when that technician is
       * eligible and scheduled for this program/window.
       */
      if (
        scheduledTechnicianIds.has(
          existingWorkOrder.assignedTechnicianId
        )
      ) {
        bookedTechnicianIds.add(
          existingWorkOrder.assignedTechnicianId
        );
      }

      return;
    }

    /*
     * An unassigned scheduled work order still consumes one
     * available technician slot.
     */
    unassignedWorkOrderCount += 1;
  }
);

const availableScheduledTechnicianCount =
  Array.from(scheduledTechnicianIds).filter(
    (technicianId) =>
      !bookedTechnicianIds.has(technicianId)
  ).length;

const remainingCapacity =
  availableScheduledTechnicianCount -
  unassignedWorkOrderCount;

const availableTechnicianExists =
  remainingCapacity > 0;

      if (updateUi) {
        setHasAvailableTechnician(
          availableTechnicianExists
        );

        setAvailabilityMessage(
          availableTechnicianExists
            ? `${remainingCapacity} technician ${
                remainingCapacity === 1 ? "slot is" : "slots are"
              } available for this program and time window.`
            : "No remaining technician capacity is available for this program and time window."
        );
      }

      return availableTechnicianExists;
    } catch (availabilityError) {
      console.error(
        "Unable to check technician availability:",
        availabilityError
      );

      if (updateUi) {
        setHasAvailableTechnician(false);
        setAvailabilityMessage(
          "Unable to verify technician availability."
        );
      }

      return false;
    } finally {
      if (updateUi) {
        setIsCheckingAvailability(false);
      }
    }
  }

  useEffect(() => {
    if (!projectId || !scheduledDate) {
      setTimeWindowAvailability({});
      return;
    }

    checkAllTimeWindowAvailability(
      projectId,
      scheduledDate
    );
  }, [projectId, scheduledDate]);

  useEffect(() => {
    if (!projectId || !scheduledDate || !timeWindow) {
      setHasAvailableTechnician(null);
      setAvailabilityMessage("");
      return;
    }

    checkTechnicianAvailability(
      projectId,
      scheduledDate,
      timeWindow
    );
  }, [projectId, scheduledDate, timeWindow]);

  async function checkAllTimeWindowAvailability(
  selectedProjectId: string,
  selectedDate: string
) {
  if (!selectedProjectId || !selectedDate) {
    setTimeWindowAvailability({});
    return;
  }

  try {
    setIsCheckingAvailability(true);

    const results = await Promise.all(
      TIME_WINDOWS.map(async (window) => {
        const isAvailable =
          await checkTechnicianAvailability(
            selectedProjectId,
            selectedDate,
            window,
            false
          );

        return [window, isAvailable] as const;
      })
    );

    setTimeWindowAvailability(
      Object.fromEntries(results)
    );
  } catch (availabilityError) {
    console.error(
      "Unable to check all time windows:",
      availabilityError
    );

    setTimeWindowAvailability({});
  } finally {
    setIsCheckingAvailability(false);
  }
}

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setIsSaving(true);
    setError("");

    const selectedCustomer = customers.find(
      (customer) => customer.id === customerId
    );

    const selectedServiceType = serviceTypes.find(
      (serviceType) => serviceType.id === serviceTypeId
    );

    const selectedProject = projects.find((project) => project.id === projectId);

    const selectedDeviceType = deviceTypes.find(
      (deviceType) => deviceType.id === deviceTypeId
    );

    if (!selectedCustomer || !selectedServiceType) {
      setError("Please select a customer and service type.");
      setIsSaving(false);
      return;
    }

    if (!selectedProject) {
      setError("Please select a project.");
      setIsSaving(false);
      return;
    }

    if (!selectedProject.companyId) {
      setError("The selected project is missing a company assignment.");
      setIsSaving(false);
      return;
    }

    const canUseSelectedProject =
      isSystemAdmin ||
      profile?.role === "Admin" ||
      profile?.projectIds.includes(selectedProject.id);

    if (!canUseSelectedProject) {
      setError("You do not have access to the selected project.");
      setIsSaving(false);
      return;
    }

    if (!selectedDeviceType) {
      setError("Please select a device type.");
      setIsSaving(false);
      return;
    }

    if (!selectedCompletionTemplate) {
      setError(
        "No active completion template was found for this project, service type, and device type."
      );
      setIsSaving(false);
      return;
    }

    const availabilityConfirmed =
      await checkTechnicianAvailability(
        selectedProject.id,
        scheduledDate,
        timeWindow
      );

    if (!availabilityConfirmed) {
      setError(
        "This work order cannot be created because no technician assigned to this program is available for the selected date and time window."
      );
      setIsSaving(false);
      return;
    }

    function generateWorkOrderNumber() {
      const date = new Date();
      const year = date.getFullYear();
      const random = Math.floor(1000 + Math.random() * 9000);

      return `WO-${year}-${random}`;
    }

    try {
      await addDoc(collection(db, "workOrders"), {
        workOrderNumber: generateWorkOrderNumber(),
        companyId: selectedProject.companyId,
        companyName: selectedProject.companyName || "",

        customerId: selectedCustomer.id,
        customerName: selectedCustomer.customerName,
        address: selectedCustomer.address || "",
        city: selectedCustomer.city || "",
        state: selectedCustomer.state || "",
        zip: selectedCustomer.zip || "",
        phone: selectedCustomer.phone || "",
        email: selectedCustomer.email || "",

        projectId: selectedProject.id,
        projectName: selectedProject.name || "",

        serviceTypeId: selectedServiceType.id,
        serviceTypeName: selectedServiceType.name,
        serviceDurationMinutes: selectedServiceType.durationMinutes || 0,

        deviceTypeId: selectedDeviceType.id,
        deviceTypeName: selectedDeviceType.name || "",

        completionTemplateId: selectedCompletionTemplate.id,
        completionTemplateName: selectedCompletionTemplate.name || "",
        completionFormTemplateId: selectedCompletionTemplate.id,
        completionFormTemplateName: selectedCompletionTemplate.name || "",

        completion: null,
        completionData: {},
        completionNotes: "",
        completionPhotoUrls: [],

        status: "Scheduled",

        scheduledDate,
        timeWindow,

        assignedTechnicianId: "",
        assignedTechnicianName: "",

        customerScheduleToken: generateScheduleToken(),
        customerScheduleTokenUsed: false,
        customerAcceptedTerms: false,
        customerAcceptedWaiver: false,
        customerAcceptedAt: null,
        customerScheduledAt: null,
        scheduledBy: "dispatcher",

        notes,
        isActive: true,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      router.push("/work-orders");
    } catch (err: unknown) {
      console.error("Unable to save work order:", err);

      setError(
        err instanceof Error
          ? `Unable to save work order: ${err.message}`
          : "Unable to save work order."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-8">
          <Link
            href="/work-orders"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back to Work Orders
          </Link>

          <h1 className="mt-4 text-3xl font-bold">New Work Order</h1>
          <p className="mt-2 text-slate-400">
            Create a scheduled work order for a customer.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-w-3xl rounded-xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Customer
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
                disabled={isLoadingOptions}
              >
                <option value="">
                  {isLoadingOptions ? "Loading customers..." : "Select customer"}
                </option>

                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customerName}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Project
              </label>
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setDeviceTypeId("");
                  setTimeWindow("");
                  setTimeWindowAvailability({});
                  setHasAvailableTechnician(null);
                  setAvailabilityMessage("");
                }}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
                disabled={isLoadingOptions}
              >
                <option value="">
                  {isLoadingOptions ? "Loading projects..." : "Select project"}
                </option>

                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name || "Unnamed Project"}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Service Type
              </label>
              <select
                value={serviceTypeId}
                onChange={(e) => setServiceTypeId(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
                disabled={isLoadingOptions}
              >
                <option value="">
                  {isLoadingOptions
                    ? "Loading service types..."
                    : "Select service type"}
                </option>

                {serviceTypes.map((serviceType) => (
                  <option key={serviceType.id} value={serviceType.id}>
                    {serviceType.name} — {serviceType.durationMinutes} min
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Device Type
              </label>
              <select
                value={deviceTypeId}
                onChange={(e) => setDeviceTypeId(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
                disabled={isLoadingOptions || !projectId}
              >
                <option value="">
                  {!projectId ? "Select project first" : "Select device type"}
                </option>

                {filteredDeviceTypes.map((deviceType) => (
                  <option key={deviceType.id} value={deviceType.id}>
                    {deviceType.name || "Unnamed Device Type"}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 rounded-lg border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm font-medium text-slate-300">
                Completion Template
              </p>

              {projectId && serviceTypeId && deviceTypeId ? (
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
                <p className="mt-2 text-sm text-slate-500">
                  Select project, service type, and device type to match a
                  completion template.
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Scheduled Date
              </label>
              <input
                type="date"
                value={scheduledDate}
               onChange={(e) => {
                setScheduledDate(e.target.value);
                setTimeWindow("");
                setTimeWindowAvailability({});
                setHasAvailableTechnician(null);
                setAvailabilityMessage("");
              }}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Time Window
              </label>
              <select
                value={timeWindow}
                onChange={(e) => {
                  setTimeWindow(e.target.value);
                  setHasAvailableTechnician(null);
                  setAvailabilityMessage("");
                }}
                disabled={
                  !projectId ||
                  !scheduledDate ||
                  isCheckingAvailability
                }
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
                required
              >
                <option value="">
                  {!projectId
                    ? "Select project first"
                    : !scheduledDate
                    ? "Select date first"
                    : isCheckingAvailability
                    ? "Checking availability..."
                    : "Select time window"}
                </option>

                {TIME_WINDOWS.map((window) => {
                  const availability =
                    timeWindowAvailability[window];

                  const isUnavailable =
                    availability === false;

                  return (
                    <option
                      key={window}
                      value={window}
                      disabled={isUnavailable}
                    >
                      {window}
                      {isUnavailable
                        ? " — No availability"
                        : availability === true
                        ? " — Available"
                        : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="md:col-span-2">
              {!projectId || !scheduledDate || !timeWindow ? (
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">
                  Select a project, date, and time window to check technician
                  availability.
                </div>
              ) : isCheckingAvailability ? (
                <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-300">
                  Checking technician availability...
                </div>
              ) : hasAvailableTechnician === true ? (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">
                  {availabilityMessage}
                </div>
              ) : hasAvailableTechnician === false ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                  {availabilityMessage}
                </div>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add job notes, access instructions, or special requirements."
                className="mt-2 min-h-32 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="mt-8 flex justify-end gap-3">
            <Link
              href="/work-orders"
              className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                isSaving ||
                isLoadingOptions ||
                isCheckingAvailability ||
                hasAvailableTechnician !== true
              }
              className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Work Order"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
export default function NewWorkOrderPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="p-8 text-slate-400">
            Loading new work order...
          </div>
        </AppShell>
      }
    >
      <NewWorkOrderPageContent />
    </Suspense>
  );
}