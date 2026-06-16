"use client";

import AppShell from "@/components/AppShell";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type WorkOrder = {
  id: string;
  accountNumber?: string;
  customerName?: string;
  streetAddress?: string;
  customerAddress?: string;
  serviceAddress?: string;
  addressLine1?: string;
  serviceTypeName?: string;
  serviceType?: string;
  scheduledDate?: string;
  date?: string;
  timeWindow?: string;
  status?: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  isActive?: boolean;
};

type Technician = {
  id: string;
  name?: string;
  displayName?: string;
  email?: string;
  role?: string;
};

const STATUS_COLUMNS = ["Scheduled", "Assigned", "Completed", "Closed"];

export default function DispatchPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(
    null
  );
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const [dateFilter, setDateFilter] = useState("today");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const workOrdersQuery = query(
          collection(db, "workOrders"),
          where("isActive", "==", true),
          orderBy("scheduledDate", "asc")
        );

        const usersQuery = query(
          collection(db, "users"),
          where("role", "==", "Technician")
        );

        const [workOrdersSnap, usersSnap] = await Promise.all([
          getDocs(workOrdersQuery),
          getDocs(usersQuery),
        ]);

        const loadedWorkOrders: WorkOrder[] = workOrdersSnap.docs.map(
          (document) => ({
            id: document.id,
            ...(document.data() as Omit<WorkOrder, "id">),
          })
        );

        const loadedTechnicians: Technician[] = usersSnap.docs.map(
          (document) => ({
            id: document.id,
            ...(document.data() as Omit<Technician, "id">),
          })
        );

        setWorkOrders(loadedWorkOrders);
        setTechnicians(loadedTechnicians);
      } catch (err) {
        console.error(err);
        setError("Unable to load the dispatch board.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredWorkOrders = useMemo(() => {
  return workOrders.filter(
    (workOrder) =>
      isWithinDateFilter(workOrder) && matchesSearch(workOrder)
  );
}, [workOrders, dateFilter, searchTerm]);

  const groupedWorkOrders = useMemo(() => {
    return STATUS_COLUMNS.reduce<Record<string, WorkOrder[]>>((acc, status) => {
      acc[status] = filteredWorkOrders.filter((workOrder) => {
        const currentStatus = workOrder.status || "Scheduled";
        return currentStatus === status;
      });

      return acc;
    }, {});
  }, [filteredWorkOrders]);

  function openAssignModal(workOrder: WorkOrder) {
    setSelectedWorkOrder(workOrder);
    setSelectedTechnicianId(workOrder.assignedTechnicianId || "");
  }

  const totalFiltered = filteredWorkOrders.length;

const unassignedCount = filteredWorkOrders.filter(
  (workOrder) => !workOrder.assignedTechnicianId
).length;

const assignedCount = filteredWorkOrders.filter(
  (workOrder) => workOrder.status === "Assigned"
).length;

const completedCount = filteredWorkOrders.filter(
  (workOrder) => workOrder.status === "Completed"
).length;

  function closeAssignModal() {
    setSelectedWorkOrder(null);
    setSelectedTechnicianId("");
    setIsAssigning(false);
  }

  async function handleAssignTechnician() {
    if (!selectedWorkOrder || !selectedTechnicianId) return;

    const technician = technicians.find(
      (tech) => tech.id === selectedTechnicianId
    );

    const technicianName =
      technician?.name || technician?.displayName || technician?.email || "";

    try {
      setIsAssigning(true);

      await updateDoc(doc(db, "workOrders", selectedWorkOrder.id), {
        assignedTechnicianId: selectedTechnicianId,
        assignedTechnicianName: technicianName,
        status: "Assigned",
      });

      setWorkOrders((current) =>
        current.map((workOrder) =>
          workOrder.id === selectedWorkOrder.id
            ? {
                ...workOrder,
                assignedTechnicianId: selectedTechnicianId,
                assignedTechnicianName: technicianName,
                status: "Assigned",
              }
            : workOrder
        )
      );

      closeAssignModal();
    } catch (err) {
      console.error(err);
      setError("Unable to assign technician.");
      setIsAssigning(false);
    }
  }

  const technicianWorkloads = useMemo(() => {
  return technicians
    .map((technician) => {
      const technicianName =
        technician.name || technician.displayName || technician.email || technician.id;

      const assignedJobs = filteredWorkOrders.filter(
        (workOrder) =>
          workOrder.assignedTechnicianId === technician.id &&
          workOrder.status === "Assigned"
      );

      return {
        technicianId: technician.id,
        technicianName,
        count: assignedJobs.length,
      };
    })
    .sort((a, b) => b.count - a.count);
}, [technicians, filteredWorkOrders]);

  async function handleStatusChange(workOrder: WorkOrder, status: string) {
    try {
      await updateDoc(doc(db, "workOrders", workOrder.id), {
        status,
      });

      setWorkOrders((current) =>
        current.map((item) =>
          item.id === workOrder.id ? { ...item, status } : item
        )
      );
    } catch (err) {
      console.error(err);
      setError("Unable to update work order status.");
    }
  }

  function getNextStatus(status?: string) {
  if (!status || status === "Scheduled") return "Assigned";
  if (status === "Assigned") return "Completed";
  if (status === "Completed") return "Closed";
  return null;
}

  function formatDate(value?: string) {
    if (!value) return "No date";

    const date = parseLocalDate(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getWorkOrderAddress(workOrder: WorkOrder) {
  return (
    workOrder.address ||
    workOrder.streetAddress ||
    workOrder.customerAddress ||
    workOrder.serviceAddress ||
    workOrder.addressLine1 ||
    ""
  );
}

  function matchesSearch(workOrder: WorkOrder) {
  const search = searchTerm.trim().toLowerCase();

  if (!search) return true;

  const searchableText = [
    workOrder.accountNumber,
    workOrder.customerName,
    workOrder.serviceTypeName,
    workOrder.serviceType,
    workOrder.assignedTechnicianName,
    getWorkOrderAddress(workOrder),
    workOrder.city,
    workOrder.state,
    workOrder.zip,
    workOrder.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(search);
}

function parseLocalDate(value?: string) {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0
  );
}

  function getServiceType(workOrder: WorkOrder) {
    return workOrder.serviceTypeName || workOrder.serviceType || "Service";
  }

  function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function isWithinDateFilter(workOrder: WorkOrder) {
  const value = workOrder.scheduledDate || workOrder.date;
  if (!value) return dateFilter === "all";

  const workOrderDate = parseLocalDate(value);
  if (Number.isNaN(workOrderDate.getTime())) return dateFilter === "all";

  const today = startOfDay(new Date());

  if (dateFilter === "today") {
    return workOrderDate >= today && workOrderDate <= endOfDay(today);
  }

  if (dateFilter === "tomorrow") {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return workOrderDate >= tomorrow && workOrderDate <= endOfDay(tomorrow);
  }

  if (dateFilter === "week") {
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);
    return workOrderDate >= today && workOrderDate <= endOfDay(weekEnd);
  }

  return true;
}

  return (
    <AppShell>
      <div className="min-h-screen bg-black p-8 text-white">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dispatch Board</h1>
            <p className="mt-2 text-sm text-slate-400">
              Manage scheduled, assigned, completed, and closed work orders.
            </p>
          </div>

          <Link
            href="/work-orders/new"
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400"
          >
            New Work Order
          </Link>
        </div>

        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 lg:flex-row lg:items-center lg:justify-between">
  <div className="flex flex-wrap gap-2">
    {[
      { label: "Today", value: "today" },
      { label: "Tomorrow", value: "tomorrow" },
      { label: "This Week", value: "week" },
      { label: "All", value: "all" },
    ].map((option) => (
      <button
        key={option.value}
        onClick={() => setDateFilter(option.value)}
        className={`rounded-lg px-4 py-2 text-sm font-semibold ${
          dateFilter === option.value
            ? "bg-blue-500 text-white"
            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>

  <input
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    placeholder="Search customer, address, technician..."
    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500 lg:max-w-md"
  />
</div>

<div className="mb-6 grid gap-4 md:grid-cols-4">
  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
    <p className="text-sm text-slate-400">Visible Work Orders</p>
    <p className="mt-2 text-2xl font-bold">{totalFiltered}</p>
  </div>

  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
    <p className="text-sm text-slate-400">Unassigned</p>
    <p className="mt-2 text-2xl font-bold text-yellow-400">
      {unassignedCount}
    </p>
  </div>

  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
    <p className="text-sm text-slate-400">Assigned</p>
    <p className="mt-2 text-2xl font-bold text-blue-400">
      {assignedCount}
    </p>
  </div>

  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
    <p className="text-sm text-slate-400">Completed</p>
    <p className="mt-2 text-2xl font-bold text-green-400">
      {completedCount}
    </p>
  </div>
</div>

<div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
  <div className="mb-4 flex items-center justify-between">
    <h2 className="font-semibold">Technician Workload</h2>
    <span className="text-xs text-slate-500">
      Assigned jobs in current filter
    </span>
  </div>

  {technicianWorkloads.length ? (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {technicianWorkloads.map((tech) => (
        <div
          key={tech.technicianId}
          className="rounded-lg border border-slate-800 bg-slate-950 p-3"
        >
          <p className="truncate text-sm font-semibold text-slate-200">
            {tech.technicianName}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {tech.count} assigned job{tech.count === 1 ? "" : "s"}
          </p>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-sm text-slate-500">No technicians found.</p>
  )}
</div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
            Loading dispatch board...
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-4">
            {STATUS_COLUMNS.map((status) => (
              <div
                key={status}
                className="rounded-xl border border-slate-800 bg-slate-900"
              >
                <div className="flex items-center justify-between border-b border-slate-800 p-4">
                  <h2 className="font-semibold">{status}</h2>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    {groupedWorkOrders[status]?.length || 0}
                  </span>
                </div>

                <div className="space-y-4 p-4">
                  {groupedWorkOrders[status]?.length ? (
                    groupedWorkOrders[status].map((workOrder) => (
                      <div
                        key={workOrder.id}
                        className="rounded-lg border border-slate-700 bg-slate-950 p-4"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-blue-400">
                              {workOrder.accountNumber || workOrder.id}
                            </p>
                            <h3 className="mt-1 font-bold">
                              {workOrder.customerName || "Unnamed Customer"}
                            </h3>
                          </div>

                          <select
                            value={workOrder.status || "Scheduled"}
                            onChange={(e) =>
                              handleStatusChange(workOrder, e.target.value)
                            }
                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                          >
                            {STATUS_COLUMNS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2 text-sm text-slate-300">
                          <p>
                            <span className="text-slate-500">Service:</span>{" "}
                            {getServiceType(workOrder)}
                          </p>

                          <p>
                            <span className="text-slate-500">Date:</span>{" "}
                            {formatDate(
                              workOrder.scheduledDate || workOrder.date
                            )}
                          </p>

                          <p>
                            <span className="text-slate-500">Window:</span>{" "}
                            {workOrder.timeWindow || "Not set"}
                          </p>

                          <p>
                            <span className="text-slate-500">Technician:</span>{" "}
                            {workOrder.assignedTechnicianName || "Unassigned"}
                          </p>

                          {getWorkOrderAddress(workOrder) && (
                            <p>
                              <span className="text-slate-500">Address:</span>{" "}
                              {getWorkOrderAddress(workOrder)}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 grid gap-2">
                          <Link
                            href={`/work-orders/${workOrder.id}`}
                            className="flex-1 rounded-md border border-slate-700 px-3 py-2 text-center text-xs font-semibold text-slate-200 hover:bg-slate-800"
                          >
                            View
                          </Link>

                          <button
                            onClick={() => openAssignModal(workOrder)}
                            className="flex-1 rounded-md bg-blue-500 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-400"
                          >
                            {workOrder.assignedTechnicianId
                              ? "Reassign"
                              : "Assign"}
                          </button>
                          {getNextStatus(workOrder.status) && (
                          <button
                            onClick={() =>
                              handleStatusChange(workOrder, getNextStatus(workOrder.status)!)
                            }
                            className="rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                          >
                            Move to {getNextStatus(workOrder.status)}
                          </button>
                         )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-sm text-slate-500">
                      No {status.toLowerCase()} work orders.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedWorkOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <h2 className="text-xl font-bold">Assign Technician</h2>

              <p className="mt-2 text-sm text-slate-400">
                {selectedWorkOrder.customerName || "Unnamed Customer"} —{" "}
                {getServiceType(selectedWorkOrder)}
              </p>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Technician
                </label>

                <select
                  value={selectedTechnicianId}
                  onChange={(e) => setSelectedTechnicianId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
                >
                  <option value="">Select technician</option>

                  {technicians.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.name ||
                        technician.displayName ||
                        technician.email ||
                        technician.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={closeAssignModal}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  onClick={handleAssignTechnician}
                  disabled={!selectedTechnicianId || isAssigning}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAssigning ? "Assigning..." : "Assign"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}