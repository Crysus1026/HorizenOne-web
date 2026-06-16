"use client";

import AppShell from "@/components/AppShell";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Technician = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
};

type WorkOrder = {
  id: string;
  workOrderNumber?: string;
  customerName?: string;
  address?: string;
  serviceTypeName?: string;
  scheduledDate?: string;
  timeWindow?: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  status?: string;
  isActive?: boolean;
  serviceDurationMinutes?: number;
};

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function isCalendarStatus(status?: string) {
  const normalizedStatus = status?.toLowerCase();

  return (
    normalizedStatus === "assigned" ||
    normalizedStatus === "completed" ||
    normalizedStatus === "verified"
  );
}

function getStartMinutes(timeWindow?: string) {
  if (!timeWindow) return 9999;

  const startTime = timeWindow.split("-")[0].trim();

  const match = startTime.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
  );

  if (!match) return 9999;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) {
    hours += 12;
  }

  if (period === "AM" && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedDateString = useMemo(
    () => formatDateInput(selectedDate),
    [selectedDate]
  );

  const assignedCount = workOrders.filter(
    (workOrder) => workOrder.status?.toLowerCase() === "assigned"
  ).length;

  const completedCount = workOrders.filter(
    (workOrder) => workOrder.status?.toLowerCase() === "completed"
  ).length;

  const verifiedCount = workOrders.filter(
    (workOrder) => workOrder.status?.toLowerCase() === "verified"
  ).length;

  const openTechniciansCount = technicians.filter((technician) => {
    return workOrders.some(
      (workOrder) =>
        workOrder.assignedTechnicianId === technician.id ||
        workOrder.assignedTechnicianName === technician.name
    );
  }).length;

  useEffect(() => {
    async function loadCalendarData() {
      try {
        setIsLoading(true);
        setError("");

        const techniciansQuery = query(
          collection(db, "users"),
          where("role", "==", "Technician"),
          where("isActive", "==", true),
          orderBy("name", "asc")
        );

        const workOrdersQuery = query(
          collection(db, "workOrders"),
          where("scheduledDate", "==", selectedDateString)
        );

        const [techniciansSnap, workOrdersSnap] = await Promise.all([
          getDocs(techniciansQuery),
          getDocs(workOrdersQuery),
        ]);

        const techniciansData = techniciansSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Technician[];

        const loadedWorkOrders = workOrdersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as WorkOrder[];

        const workOrdersData = loadedWorkOrders.filter(
          (workOrder) =>
            workOrder.isActive !== false &&
            isCalendarStatus(workOrder.status)
        );

        const activeTechnicians = techniciansData.filter((technician) => {
  const appointmentCount = workOrdersData.filter(
    (workOrder) =>
      workOrder.assignedTechnicianId === technician.id ||
      workOrder.assignedTechnicianName === technician.name
  ).length;

  return appointmentCount > 0;
});

const sortedTechnicians = activeTechnicians.sort((a, b) => {
  const aCount = workOrdersData.filter(
    (workOrder) =>
      workOrder.assignedTechnicianId === a.id ||
      workOrder.assignedTechnicianName === a.name
  ).length;

  const bCount = workOrdersData.filter(
    (workOrder) =>
      workOrder.assignedTechnicianId === b.id ||
      workOrder.assignedTechnicianName === b.name
  ).length;

  return bCount - aCount;
});

setTechnicians(sortedTechnicians);
setWorkOrders(workOrdersData);
      } catch (err) {
        console.error(err);
        setError("Failed to load calendar.");
      } finally {
        setIsLoading(false);
      }
    }

    loadCalendarData();
  }, [selectedDateString]);

  function moveDay(amount: number) {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(selectedDate.getDate() + amount);
    setSelectedDate(nextDate);
  }

  function goToday() {
    setSelectedDate(new Date());
  }

  function getScheduledHoursForTechnician(technician: Technician) {
  const technicianWorkOrders = getWorkOrdersForTechnician(technician);

  const totalMinutes = technicianWorkOrders.reduce((sum, workOrder) => {
    return sum + Number(workOrder.serviceDurationMinutes || 0);
  }, 0);

  return totalMinutes / 60;
}

  function getWorkOrdersForTechnician(technician: Technician) {
    return workOrders
      .filter(
        (workOrder) =>
          workOrder.assignedTechnicianId === technician.id ||
          workOrder.assignedTechnicianName === technician.name
      )
      .sort(
        (a, b) =>
          getStartMinutes(a.timeWindow) -
          getStartMinutes(b.timeWindow)
      );
    }    

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Calendar Controls */}
        <div className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Calendar</h1>
            <p className="text-sm text-zinc-400">
              {formatDisplayDate(selectedDate)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => moveDay(-1)}
              className="rounded-md border border-cyan-500 px-4 py-2 text-cyan-400 hover:bg-cyan-500 hover:text-black"
            >
              ← Previous
            </button>

            <button
              onClick={goToday}
              className="rounded-md border border-zinc-700 px-4 py-2 text-white hover:bg-zinc-800"
            >
              Today
            </button>

            <button
              onClick={() => moveDay(1)}
              className="rounded-md border border-cyan-500 px-4 py-2 text-cyan-400 hover:bg-cyan-500 hover:text-black"
            >
              Next →
            </button>
          </div>
        </div>

                {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-blue-500 bg-zinc-950 p-4">
            <p className="text-sm text-zinc-400">Assigned</p>
            <p className="mt-2 text-3xl font-bold text-blue-400">
              {assignedCount}
            </p>
          </div>

          <div className="rounded-lg border border-green-500 bg-zinc-950 p-4">
            <p className="text-sm text-zinc-400">Completed</p>
            <p className="mt-2 text-3xl font-bold text-green-400">
              {completedCount}
            </p>
          </div>

          <div className="rounded-lg border border-purple-500 bg-zinc-950 p-4">
            <p className="text-sm text-zinc-400">Verified</p>
            <p className="mt-2 text-3xl font-bold text-purple-400">
              {verifiedCount}
            </p>
          </div>

          <div className="rounded-lg border border-cyan-500 bg-zinc-950 p-4">
            <p className="text-sm text-zinc-400">Active Technicians</p>
            <p className="mt-2 text-3xl font-bold text-cyan-400">
              {openTechniciansCount}
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-500 bg-red-950 p-3 text-red-300">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-zinc-400">Loading calendar...</div>
        ) : (
          <div className="overflow-x-auto">
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${Math.max(
                  technicians.length,
                  1
                )}, minmax(280px, 1fr))`,
              }}
            >
              {technicians.map((technician) => {
                const technicianWorkOrders =
                  getWorkOrdersForTechnician(technician);

                return (
                  <div
                    key={technician.id}
                    className="min-h-[500px] rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <div className="mb-4 border-b border-zinc-800 pb-3">
                      <h2 className="font-semibold text-white">
                        {technician.name || technician.email || "Technician"}
                      </h2>

                      <p className="text-xs text-zinc-500">
                        {technicianWorkOrders.length} appointment
                        {technicianWorkOrders.length === 1 ? "" : "s"}
                      </p>
                      <p className="text-xs text-cyan-400">
                        {getScheduledHoursForTechnician(technician).toFixed(1)} scheduled hours
                      </p>
                    </div>

                    <div className="space-y-3">
                      {technicianWorkOrders.length === 0 ? (
                        <p className="text-sm text-zinc-600">
                          No assigned work orders.
                        </p>
                      ) : (
                        technicianWorkOrders.map((workOrder) => {
                          const normalizedStatus =
                            workOrder.status?.toLowerCase();

                          const isAssigned =
                            normalizedStatus === "assigned";

                          const isCompleted =
                            normalizedStatus === "completed";

                          const isVerified =
                            normalizedStatus === "verified";

                          return (
                            <Link
                              key={workOrder.id}
                              href={`/work-orders/${workOrder.id}`}
                              className={`block rounded-lg border bg-black p-3 transition hover:bg-zinc-900 ${
                                isCompleted
                                  ? "border-green-500"
                                :isVerified
                                  ? "border-purple-500"
                                  : "border-blue-500"
                              }`}
                            >
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-white">
                                  {workOrder.timeWindow || "No time window"}
                                </span>

                                <span
                                  className={`rounded-full px-2 py-1 text-xs ${
                                    isCompleted
                                      ? "bg-green-500/20 text-green-300"
                                    :isVerified
                                    ? "bg-purple-500/20 text-purple-300"  
                                      : "bg-blue-500/20 text-blue-300"
                                  }`}
                                >
                                  {workOrder.status}
                                </span>
                              </div>

                              <p className="font-medium text-cyan-400">
                                {workOrder.customerName || "No customer"}
                              </p>

                              <p className="text-sm text-zinc-400">
                                {workOrder.serviceTypeName || "Service"}
                              </p>

                              {workOrder.address && (
                                <p className="mt-2 text-xs text-zinc-500">
                                  {workOrder.address}
                                </p>
                              )}

                              {workOrder.workOrderNumber && (
                                <p className="mt-2 text-xs text-zinc-600">
                                  WO #{workOrder.workOrderNumber}
                                </p>
                              )}
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isLoading && technicians.length === 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
            No active technicians found.
          </div>
        )}
      </div>
    </AppShell>
  );
}