"use client";

import AppShell from "@/components/AppShell";
import { db } from "@/lib/firebase";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();

  const workOrderId = params.id as string;

  const [customerName, setCustomerName] = useState("");
  const [serviceTypeName, setServiceTypeName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [timeWindow, setTimeWindow] = useState("");
  const [status, setStatus] = useState("Scheduled");
  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadWorkOrder() {
      try {
        const workOrderRef = doc(db, "workOrders", workOrderId);
        const workOrderSnap = await getDoc(workOrderRef);

        if (!workOrderSnap.exists()) {
          setError("Work order not found.");
          return;
        }

        const data = workOrderSnap.data();

        setCustomerName(data.customerName || "");
        setServiceTypeName(data.serviceTypeName || "");
        setScheduledDate(data.scheduledDate || "");
        setTimeWindow(data.timeWindow || "");
        setStatus(data.status || "Scheduled");
        setNotes(data.notes || "");
      } catch (err) {
        console.error(err);
        setError("Unable to load work order.");
      } finally {
        setIsLoading(false);
      }
    }

    if (workOrderId) {
      loadWorkOrder();
    }
  }, [workOrderId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setIsSaving(true);
    setError("");

    try {
      const workOrderRef = doc(db, "workOrders", workOrderId);

      await updateDoc(workOrderRef, {
        scheduledDate,
        timeWindow,
        status,
        notes,
        updatedAt: serverTimestamp(),
      });

      router.push("/work-orders");
    } catch (err) {
      console.error(err);
      setError("Unable to update work order.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-8 text-slate-400">Loading work order...</div>
      </AppShell>
    );
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

          <h1 className="mt-4 text-3xl font-bold">Work Order Detail</h1>
          <p className="mt-2 text-slate-400">
            View and update schedule, status, and notes.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="max-w-3xl rounded-xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm text-slate-400">Customer</p>
              <p className="mt-2 font-semibold text-white">{customerName}</p>
            </div>

            <div>
              <p className="text-sm text-slate-400">Service Type</p>
              <p className="mt-2 font-semibold text-white">
                {serviceTypeName}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Scheduled Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
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
                onChange={(e) => setTimeWindow(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
              >
                <option value="">Select time window</option>
                <option value="8:00 AM - 10:00 AM">8:00 AM - 10:00 AM</option>
                <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM</option>
                <option value="12:00 PM - 2:00 PM">12:00 PM - 2:00 PM</option>
                <option value="2:00 PM - 4:00 PM">2:00 PM - 4:00 PM</option>
                <option value="4:00 PM - 6:00 PM">4:00 PM - 6:00 PM</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Assigned">Assigned</option>
                <option value="Completed">Completed</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2 min-h-32 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <Link
              href="/work-orders"
              className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}