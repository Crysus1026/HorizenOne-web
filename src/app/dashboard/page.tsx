"use client";

import AppShell from "@/components/AppShell";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type WorkOrder = {
  id: string;
  workOrderNumber?: string;
  customerName?: string;
  projectName?: string;
  serviceTypeName?: string;
  deviceTypeName?: string;
  scheduledDate?: string;
  timeWindow?: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  status?: string;
  isActive?: boolean;
  completedAt?: any;
};

type UserProfile = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
};

function todayString() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

export default function DashboardPage() {
    const {
    companyId,
    isSystemAdmin,
    isLoadingProfile,
    profileError,
  } = useUserProfile();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const today = todayString();

useEffect(() => {
  if (isLoadingProfile) return;

  if (profileError) {
    setError(profileError);
    setIsLoading(false);
    return;
  }

  if (!isSystemAdmin && !companyId) {
    setError("User is missing companyId.");
    setIsLoading(false);
    return;
  }

  async function loadDashboard() {
    setIsLoading(true);
    setError("");

    try {
      const workOrdersQuery = isSystemAdmin
        ? query(
            collection(db, "workOrders"),
            where("isActive", "==", true),
            orderBy("scheduledDate", "asc")
          )
        : query(
            collection(db, "workOrders"),
            where("companyId", "==", companyId),
            where("isActive", "==", true),
            orderBy("scheduledDate", "asc")
          );

      const usersQuery = isSystemAdmin
        ? query(collection(db, "users"), orderBy("email", "asc"))
        : query(
            collection(db, "users"),
            where("companyId", "==", companyId),
            where("role", "==", "Technician")
          );

      const workOrdersSnap = await getDocs(workOrdersQuery);
      const usersSnap = await getDocs(usersQuery);

      setWorkOrders(
        workOrdersSnap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<WorkOrder, "id">),
        }))
      );

      setUsers(
        usersSnap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<UserProfile, "id">),
        }))
      );
    } catch (err) {
      console.error(err);
      setError("Unable to load dashboard.");
    } finally {
      setIsLoading(false);
    }
  }

  loadDashboard();
}, [companyId, isSystemAdmin, isLoadingProfile, profileError]);

  const dashboardData = useMemo(() => {
    const openWorkOrders = workOrders.filter(
      (wo) => wo.status !== "Completed" && wo.status !== "Closed"
    );

    const todayWorkOrders = workOrders.filter(
      (wo) => wo.scheduledDate === today
    );

    const scheduledToday = todayWorkOrders.filter(
      (wo) => wo.status === "Scheduled"
    );

    const assignedToday = todayWorkOrders.filter(
      (wo) => wo.status === "Assigned"
    );

    const completedToday = todayWorkOrders.filter(
      (wo) => wo.status === "Completed" || wo.status === "Closed"
    );

    const unassignedWorkOrders = workOrders.filter(
      (wo) =>
        wo.status !== "Completed" &&
        wo.status !== "Closed" &&
        !wo.assignedTechnicianId
    );

    const recentlyCompleted = workOrders
      .filter((wo) => wo.status === "Completed" || wo.status === "Closed")
      .slice()
      .reverse()
      .slice(0, 8);

    const activeTechnicians = users.filter(
      (user) => user.isActive !== false && user.role === "Technician"
    );

    return {
      openWorkOrders,
      todayWorkOrders,
      scheduledToday,
      assignedToday,
      completedToday,
      unassignedWorkOrders,
      recentlyCompleted,
      activeTechnicians,
    };
  }, [workOrders, users, today]);

  return (
    <AppShell>
      <div className="space-y-6 px-6 py-6 text-white">
        <div>
          <p className="text-sm font-medium text-cyan-400">Operations</p>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Today&apos;s schedule, open work orders, unassigned work, and recent
            completions.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {isLoading ? (
          <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Loading dashboard...</p>
          </section>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                label="Open Work Orders"
                value={dashboardData.openWorkOrders.length}
              />
              <MetricCard
                label="Scheduled Today"
                value={dashboardData.scheduledToday.length}
              />
              <MetricCard
                label="Assigned Today"
                value={dashboardData.assignedToday.length}
              />
              <MetricCard
                label="Completed Today"
                value={dashboardData.completedToday.length}
              />
              <MetricCard
                label="Active Technicians"
                value={dashboardData.activeTechnicians.length}
              />
            </div>

            <DashboardSection
              title="Today's Schedule"
              emptyText="No work orders scheduled for today."
            >
              <WorkOrderTable workOrders={dashboardData.todayWorkOrders} />
            </DashboardSection>

            <DashboardSection
              title="Unassigned Work Orders"
              emptyText="No unassigned work orders."
            >
              <WorkOrderTable
                workOrders={dashboardData.unassignedWorkOrders.slice(0, 10)}
              />
            </DashboardSection>

            <DashboardSection
              title="Recently Completed"
              emptyText="No completed work orders yet."
            >
              <WorkOrderTable workOrders={dashboardData.recentlyCompleted} />
            </DashboardSection>
          </>
        )}
      </div>
    </AppShell>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-bold text-cyan-300">{value}</p>
    </section>
  );
}

function DashboardSection({
  title,
  emptyText,
  children,
}: {
  title: string;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-4">{children || emptyText}</div>
    </section>
  );
}

function WorkOrderTable({ workOrders }: { workOrders: WorkOrder[] }) {
  if (workOrders.length === 0) {
    return <p className="text-sm text-slate-400">No work orders to show.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-800 text-slate-300">
          <tr>
            <th className="px-4 py-3 font-medium">Work Order</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Service</th>
            <th className="px-4 py-3 font-medium">Schedule</th>
            <th className="px-4 py-3 font-medium">Technician</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-700">
          {workOrders.map((workOrder) => (
            <tr key={workOrder.id}>
              <td className="px-4 py-3 text-slate-300">
                {workOrder.workOrderNumber || workOrder.id}
              </td>

              <td className="px-4 py-3">
                <div className="font-medium text-white">
                  {workOrder.customerName || "—"}
                </div>
                <div className="text-xs text-slate-500">
                  {workOrder.projectName || ""}
                </div>
              </td>

              <td className="px-4 py-3 text-slate-300">
                <div>{workOrder.serviceTypeName || "—"}</div>
                <div className="text-xs text-slate-500">
                  {workOrder.deviceTypeName || ""}
                </div>
              </td>

              <td className="px-4 py-3 text-slate-300">
                <div>{workOrder.scheduledDate || "—"}</div>
                <div className="text-xs text-slate-500">
                  {workOrder.timeWindow || ""}
                </div>
              </td>

              <td className="px-4 py-3 text-slate-300">
                {workOrder.assignedTechnicianName || "Unassigned"}
              </td>

              <td className="px-4 py-3">
                <span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-medium text-cyan-300">
                  {workOrder.status || "—"}
                </span>
              </td>

              <td className="px-4 py-3">
                <Link
                  href={`/work-orders/${workOrder.id}`}
                  className="text-xs font-medium text-cyan-300 hover:text-cyan-200"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}