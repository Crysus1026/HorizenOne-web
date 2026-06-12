"use client";

import AppShell from "@/components/AppShell";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Customer = {
  accountNumber?: string;
  customerName?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  notes?: string;
  isActive?: boolean;
};

type WorkOrder = {
  id: string;
  workOrderNumber?: string;
  customerId?: string;
  customerName?: string;
  serviceTypeName?: string;
  scheduledDate?: string;
  timeWindow?: string;
  assignedTechnicianName?: string;
  status?: string;
  notes?: string;
};

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCustomerDetail() {
      if (!customerId) return;

      try {
        setLoading(true);
        setError("");

        const customerRef = doc(db, "customers", customerId);
        const customerSnap = await getDoc(customerRef);

        if (!customerSnap.exists()) {
          setCustomer(null);
          return;
        }

        setCustomer(customerSnap.data() as Customer);

        const workOrdersQuery = query(
          collection(db, "workOrders"),
          where("customerId", "==", customerId),
          orderBy("scheduledDate", "desc")
        );

        const workOrdersSnap = await getDocs(workOrdersQuery);

        const loadedWorkOrders: WorkOrder[] = workOrdersSnap.docs.map(
          (document) => ({
            id: document.id,
            ...(document.data() as Omit<WorkOrder, "id">),
          })
        );

        setWorkOrders(loadedWorkOrders);
      } catch (err) {
        console.error(err);
        setError("Unable to load customer detail.");
      } finally {
        setLoading(false);
      }
    }

    loadCustomerDetail();
  }, [customerId]);

  const openWorkOrders = useMemo(() => {
    return workOrders.filter(
      (workOrder) =>
        workOrder.status !== "Completed" && workOrder.status !== "Closed"
    );
  }, [workOrders]);

  const completedWorkOrders = useMemo(() => {
    return workOrders.filter(
      (workOrder) =>
        workOrder.status === "Completed" || workOrder.status === "Closed"
    );
  }, [workOrders]);

  function getCustomerName() {
    return customer?.customerName || customer?.name || "Unnamed Customer";
  }

  function getFullAddress() {
    return [customer?.address, customer?.city, customer?.state, customer?.zip]
      .filter(Boolean)
      .join(", ");
  }

  function formatDate(value?: string) {
    if (!value) return "No date";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen bg-slate-950 p-8 text-white">
          Loading customer...
        </div>
      </AppShell>
    );
  }

  if (!customer) {
    return (
      <AppShell>
        <div className="min-h-screen bg-slate-950 p-8 text-white">
          <h1 className="text-2xl font-bold">Customer Not Found</h1>

          <Link
            href="/customers"
            className="mt-4 inline-block text-blue-400 hover:text-blue-300"
          >
            ← Back to Customers
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <Link
              href="/customers"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              ← Back to Customers
            </Link>

            <h1 className="mt-4 text-3xl font-bold">{getCustomerName()}</h1>

            <p className="mt-2 text-sm text-slate-400">
              Account #{customer.accountNumber || customerId}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href={`/customers/${customerId}/edit`}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
            >
              Edit Customer
            </Link>

            <Link
              href={`/work-orders/new?customerId=${customerId}`}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400"
            >
              New Work Order
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Customer Information</h2>

            <div className="mt-6 space-y-4 text-sm">
              <InfoRow label="Account Number" value={customer.accountNumber || "Not assigned"} />
              <InfoRow label="Phone" value={customer.phone || "Not set"} />
              <InfoRow label="Email" value={customer.email || "Not set"} />
              <InfoRow label="Address" value={getFullAddress() || "Not set"} />
              <InfoRow
                label="Status"
                value={customer.isActive === false ? "Inactive" : "Active"}
              />
            </div>

            {customer.notes && (
              <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm font-medium text-slate-400">Notes</p>
                <p className="mt-2 text-sm text-slate-200">{customer.notes}</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
  <h2 className="text-xl font-semibold">Work Order Summary</h2>

  <div className="mt-6 grid gap-4 md:grid-cols-3">
    <SummaryCard label="Total Work Orders" value={workOrders.length} />
    <SummaryCard label="Open" value={openWorkOrders.length} />
    <SummaryCard
      label="Completed / Closed"
      value={completedWorkOrders.length}
    />
  </div>

  <div className="mt-6">
    <h3 className="mb-3 text-lg font-semibold">Devices</h3>

    <div className="overflow-hidden rounded-lg border border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-950 text-slate-400">
          <tr>
            <th className="px-4 py-3">Device Type</th>
            <th className="px-4 py-3">Serial Number</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Installed Date</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td
              colSpan={4}
              className="px-4 py-6 text-center text-slate-500"
            >
              No devices added yet. This will be used during the inventory phase.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <WorkOrderSection
            title="Open Work Orders"
            emptyMessage="No open work orders."
            workOrders={openWorkOrders}
            formatDate={formatDate}
          />

          <WorkOrderSection
            title="Completed Work Orders"
            emptyMessage="No completed work orders."
            workOrders={completedWorkOrders}
            formatDate={formatDate}
          />
        </div>

        <div className="mt-6">
          <WorkOrderHistoryTable
          workOrders={workOrders}
          formatDate={formatDate}
        />
        </div>
      </div>
    </AppShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="mt-1 text-slate-200">{value}</p>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function WorkOrderSection({
  title,
  emptyMessage,
  workOrders,
  formatDate,
}: {
  title: string;
  emptyMessage: string;
  workOrders: WorkOrder[];
  formatDate: (value?: string) => string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-semibold">{title}</h2>

      <div className="mt-6 space-y-3">
        {workOrders.length ? (
          workOrders.map((workOrder) => (
            <Link
              key={workOrder.id}
              href={`/work-orders/${workOrder.id}`}
              className="block rounded-lg border border-slate-800 bg-slate-950 p-4 hover:border-blue-500"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-blue-400">
                    {workOrder.workOrderNumber ||
                      `WO-${workOrder.id.slice(0, 8).toUpperCase()}`}
                  </p>

                  <p className="mt-1 font-semibold">
                    {workOrder.serviceTypeName || "Service"}
                  </p>
                </div>

                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                  {workOrder.status || "Scheduled"}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-sm text-slate-400 md:grid-cols-2">
                <p>Date: {formatDate(workOrder.scheduledDate)}</p>
                <p>Window: {workOrder.timeWindow || "Not set"}</p>
                <p>
                  Technician:{" "}
                  {workOrder.assignedTechnicianName || "Unassigned"}
                </p>
              </div>
            </Link>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-sm text-slate-500">
            {emptyMessage}
          </p>
                )}
      </div>
    </div>
  );
}

        function WorkOrderHistoryTable({
  workOrders,
  formatDate,
}: {
  workOrders: WorkOrder[];
  formatDate: (value?: string) => string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-semibold">Work Order History</h2>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-slate-400">
            <tr>
              <th className="px-4 py-3">WO Number</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Service Type</th>
              <th className="px-4 py-3">Technician</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">
            {workOrders.length ? (
              workOrders.map((workOrder) => (
                <tr key={workOrder.id} className="hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/work-orders/${workOrder.id}`}
                      className="font-semibold text-blue-400 hover:text-blue-300"
                    >
                      {workOrder.workOrderNumber ||
                        `WO-${workOrder.id.slice(0, 8).toUpperCase()}`}
                    </Link>
                  </td>

                  <td className="px-4 py-3 text-slate-300">
                    {formatDate(workOrder.scheduledDate)}
                  </td>

                  <td className="px-4 py-3 text-slate-300">
                    {workOrder.serviceTypeName || "Service"}
                  </td>

                  <td className="px-4 py-3 text-slate-300">
                    {workOrder.assignedTechnicianName || "Unassigned"}
                  </td>

                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                      {workOrder.status || "Scheduled"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  No work order history yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
