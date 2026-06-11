"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type WorkOrder = {
  workOrderNumber?: string;
  companyId: string;
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

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();

  const workOrderId = params.id as string;

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const displayWorkOrderNumber =
  workOrder?.workOrderNumber || `WO-${workOrderId.slice(0, 8).toUpperCase()}`;

  useEffect(() => {
    async function loadWorkOrder() {
      if (!workOrderId) return;

      try {
        const ref = doc(db, "workOrders", workOrderId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setWorkOrder(null);
          return;
        }

        setWorkOrder(snap.data() as WorkOrder);
      } catch (error) {
        console.error("Error loading work order:", error);
      } finally {
        setLoading(false);
      }
    }

    loadWorkOrder();
  }, [workOrderId]);

  async function updateStatus(newStatus: string) {
    if (!workOrderId) return;

    setSaving(true);

    try {
      const ref = doc(db, "workOrders", workOrderId);

      await updateDoc(ref, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      setWorkOrder((prev) =>
        prev ? { ...prev, status: newStatus } : prev
      );
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update work order status.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateWorkOrder() {
    if (!workOrderId) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to deactivate this work order?"
    );

    if (!confirmDelete) return;

    setSaving(true);

    try {
      const ref = doc(db, "workOrders", workOrderId);

      await updateDoc(ref, {
        isActive: false,
        updatedAt: serverTimestamp(),
      });

      router.push("/work-orders");
    } catch (error) {
      console.error("Error deactivating work order:", error);
      alert("Failed to deactivate work order.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-white">
        Loading work order...
      </div>
    );
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

  return (
    <div className="p-6 text-white">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Work Order Detail</h1>
          <p className="mt-1 text-sm text-gray-400">
            Review, verify, close, or deactivate this work order.
          </p>
        </div>

        <Link
          href="/work-orders"
          className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
        >
          Back
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-800 bg-[#0B1220] p-5 lg:col-span-2">
          <h2 className="mb-4 text-xl font-semibold">Job Information</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailItem label="Work Order ID" value={displayWorkOrderNumber} />
            <DetailItem label="Customer" value={workOrder.customerName} />
            <DetailItem label="Service Type" value={workOrder.serviceTypeName} />
            <DetailItem
              label="Duration"
              value={`${workOrder.serviceDurationMinutes} minutes`}
            />
            <DetailItem label="Scheduled Date" value={workOrder.scheduledDate} />
            <DetailItem label="Time Window" value={workOrder.timeWindow} />
            <DetailItem
              label="Technician"
              value={workOrder.assignedTechnicianName || "Not assigned"}
            />
            <DetailItem label="Status" value={workOrder.status} />
            <DetailItem
              label="Active"
              value={workOrder.isActive ? "Yes" : "No"}
            />
          </div>

          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-gray-400">Notes</p>
            <div className="rounded-lg border border-gray-800 bg-[#070B12] p-4 text-gray-200">
              {workOrder.notes || "No notes provided."}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-[#0B1220] p-5">
          <h2 className="mb-4 text-xl font-semibold">Actions</h2>

          <div className="space-y-3">
            <Link
              href={`/work-orders/${workOrderId}/edit`}
              className="block rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-500"
            >
              Edit Work Order
            </Link>

            <Link
              href={`/work-orders/${workOrderId}/edit?assignTechnician=true`}
              className="block rounded-lg bg-cyan-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Assign to Technician
            </Link>

            {workOrder.status !== "Verified" &&
              workOrder.status !== "Closed" && (
                <button
                  onClick={() => updateStatus("Verified")}
                  disabled={saving}
                  className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                >
                  Mark Verified
                </button>
              )}

            {workOrder.status === "Verified" && (
              <button
                onClick={() => updateStatus("Closed")}
                disabled={saving}
                className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
              >
                Close Work Order
              </button>
            )}

            {workOrder.status !== "Closed" && (
              <button
                onClick={deactivateWorkOrder}
                disabled={saving}
                className="w-full rounded-lg border border-red-800 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-950 disabled:opacity-50"
              >
                Deactivate Work Order
              </button>
            )}
          </div>

          <div className="mt-5 rounded-lg border border-gray-800 bg-[#070B12] p-4 text-sm text-gray-400">
            Current status:{" "}
            <span className="font-semibold text-white">
              {workOrder.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-400">{label}</p>
      <p className="mt-1 rounded-lg border border-gray-800 bg-[#070B12] px-3 py-2 text-gray-100">
        {value}
      </p>
    </div>
  );
}