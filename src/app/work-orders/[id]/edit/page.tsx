"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  const [assignedTechnicianName, setAssignedTechnicianName] = useState("");

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

        const data = snap.data() as WorkOrder;

        setWorkOrder(data);
        setScheduledDate(data.scheduledDate || "");
        setTimeWindow(data.timeWindow || "");
        setNotes(data.notes || "");
        setAssignedTechnicianId(data.assignedTechnicianId || "");
        setAssignedTechnicianName(data.assignedTechnicianName || "");
      } catch (error) {
        console.error("Error loading work order:", error);
      } finally {
        setLoading(false);
      }
    }

    loadWorkOrder();
  }, [workOrderId]);

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

      let newStatus = workOrder.status;

      if (workOrder.status !== "Verified" && workOrder.status !== "Closed") {
        newStatus =
          assignedTechnicianId.trim() !== "" ? "Assigned" : "Scheduled";
      }

      await updateDoc(ref, {
        scheduledDate,
        timeWindow,
        notes,
        assignedTechnicianId,
        assignedTechnicianName,
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
            <ReadOnlyField label="Service Type" value={workOrder.serviceTypeName} />
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
                <option value="4:00 PM - 6:00 PM">4:00 PM - 6:00 PM</option>
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
                Technician ID
              </label>
              <input
                type="text"
                value={assignedTechnicianId}
                onChange={(e) => setAssignedTechnicianId(e.target.value)}
                className="w-full rounded-lg border border-gray-800 bg-[#070B12] px-3 py-2 text-white outline-none focus:border-blue-500"
                placeholder="Temporary technician ID"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-400">
                Technician Name
              </label>
              <input
                type="text"
                value={assignedTechnicianName}
                onChange={(e) => setAssignedTechnicianName(e.target.value)}
                className="w-full rounded-lg border border-gray-800 bg-[#070B12] px-3 py-2 text-white outline-none focus:border-blue-500"
                placeholder="Temporary technician name"
              />
            </div>

            <div className="rounded-lg border border-gray-800 bg-[#070B12] p-4 text-sm text-gray-400">
              For now, this is manual. Later, this will become a dropdown from a
              technicians collection.
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