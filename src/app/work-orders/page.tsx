"use client";

import AppShell from "@/components/AppShell";
import { orderBy, where } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { getCompanyCollection } from "@/lib/companyQueries";

type WorkOrder = {
  id: string;
  customerName: string;
  serviceTypeName: string;
  status: string;
  scheduledDate: string;
  timeWindow: string;
  assignedTechnicianName?: string;
  notes: string;
};

export default function WorkOrdersPage() {
  const {
  companyId,
  isSystemAdmin,
  isLoadingProfile,
  profileError,
} = useUserProfile();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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

  async function loadWorkOrders() {
    setIsLoading(true);
    setError("");

    try {
      const workOrdersData = await getCompanyCollection<WorkOrder>(
        "workOrders",
        companyId,
        isSystemAdmin,
        [
          where("isActive", "==", true),
          orderBy("scheduledDate", "desc"),
        ]
      );

      setWorkOrders(workOrdersData);
    } catch (err) {
      console.error(err);
      setError("Unable to load work orders.");
    } finally {
      setIsLoading(false);
    }
  }

  loadWorkOrders();
}, [companyId, isSystemAdmin, isLoadingProfile, profileError]);

  const filteredWorkOrders = workOrders.filter((workOrder) => {
    const search = searchTerm.toLowerCase();

    return (
      workOrder.customerName?.toLowerCase().includes(search) ||
      workOrder.serviceTypeName?.toLowerCase().includes(search) ||
      workOrder.status?.toLowerCase().includes(search)
    );
  });

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Work Orders</h1>
            <p className="mt-2 text-slate-400">
              Create, schedule, and track service work orders.
            </p>
          </div>

          {error && (
  <div className="mt-6 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
    {error}
  </div>
)}

          <Link
            href="/work-orders/new"
            className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-400"
          >
            + New Work Order
          </Link>
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-4">
            <input
              type="text"
              placeholder="Search work orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500"
            />
          </div>

          {isLoading ? (
            <div className="p-6 text-slate-400">Loading work orders...</div>
          ) : filteredWorkOrders.length === 0 ? (
            <div className="p-6 text-slate-400">No work orders found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Time Window</th>
                    <th className="px-4 py-3">Technician</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredWorkOrders.map((workOrder) => (
                    <tr
                      key={workOrder.id}
                      className="border-b border-slate-800 last:border-b-0"
                    >
                      <td className="px-4 py-4 font-medium text-white">
                        <Link
                          href={`/work-orders/${workOrder.id}`}
                          className="hover:text-blue-400"
                        >
                          {workOrder.customerName}
                        </Link>
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {workOrder.serviceTypeName}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {workOrder.scheduledDate}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {workOrder.timeWindow}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {workOrder.assignedTechnicianName || "Unassigned"}
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
                          {workOrder.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}