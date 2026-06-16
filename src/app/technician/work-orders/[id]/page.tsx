"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";

type WorkOrder = {
  id: string;
  customerName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  serviceTypeName?: string;
  scheduledDate?: string;
  timeWindow?: string;
  notes?: string;
  status?: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  completionNotes?: string;
};

export default function TechnicianWorkOrderPage() {
  const params = useParams();
  const router = useRouter();
  const workOrderId = params.id as string;

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setIsLoading(true);
        setError("");

        if (!currentUser) {
          setError("You must be logged in to view this work order.");
          return;
        }

        const ref = doc(db, "workOrders", workOrderId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setError("Work order not found.");
          return;
        }

        const data = {
          id: snap.id,
          ...snap.data(),
        } as WorkOrder;

        if (data.assignedTechnicianId !== currentUser.uid) {
          setError("You do not have access to this work order.");
          return;
        }

        setWorkOrder(data);
        setCompletionNotes(data.completionNotes || "");
      } catch (err) {
        console.error(err);
        setError("Failed to load work order.");
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [workOrderId]);

  async function handleCompleteWorkOrder() {
    if (!workOrder) return;

    try {
      setIsCompleting(true);
      setError("");

      const ref = doc(db, "workOrders", workOrder.id);

      await updateDoc(ref, {
        status: "Completed",
        completionNotes,
        completedAt: serverTimestamp(),
        completedByTechnicianId: workOrder.assignedTechnicianId || "",
        completedByTechnicianName: workOrder.assignedTechnicianName || "",
        updatedAt: serverTimestamp(),
      });

      router.push("/technician");
    } catch (err) {
      console.error(err);
      setError("Failed to complete work order.");
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="flex h-20 items-center justify-between border-b border-cyan-500 px-4">
        <Image
          src="/logo.png"
          alt="HorizenOne"
          width={80}
          height={80}
          className="object-contain"
        />

        <button
          onClick={() => router.push("/technician")}
          className="rounded-md border border-cyan-500 px-3 py-2 text-sm text-cyan-400"
        >
          Back
        </button>
      </header>

      <main className="space-y-5 p-4">
        {error && (
          <div className="rounded-md border border-red-500 bg-red-950 p-3 text-red-300">
            {error}
          </div>
        )}

        {isLoading ? (
          <p className="text-zinc-400">Loading work order...</p>
        ) : workOrder ? (
          <>
            <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-400">Customer</p>
              <h1 className="mt-1 text-2xl font-bold text-cyan-400">
                {workOrder.customerName || "No customer"}
              </h1>

              {workOrder.address && (
                <p className="mt-3 text-zinc-300">{workOrder.address}</p>
              )}

              {(workOrder.city || workOrder.state || workOrder.zip) && (
                <p className="text-zinc-400">
                  {workOrder.city} {workOrder.state} {workOrder.zip}
                </p>
              )}

              {workOrder.phone && (
                <p className="mt-3 text-zinc-400">
                  Phone: {workOrder.phone}
                </p>
              )}

              {workOrder.email && (
                <p className="text-zinc-400">Email: {workOrder.email}</p>
              )}
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-400">Work Order</p>

              <h2 className="mt-1 text-xl font-bold text-white">
                {workOrder.serviceTypeName || "Service"}
              </h2>

              <div className="mt-4 grid gap-3 text-sm">
                <div>
                  <p className="text-zinc-500">Date</p>
                  <p className="text-zinc-200">
                    {workOrder.scheduledDate || "Not scheduled"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500">Time Window</p>
                  <p className="text-zinc-200">
                    {workOrder.timeWindow || "No time window"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500">Status</p>
                  <p className="text-zinc-200">
                    {workOrder.status || "Assigned"}
                  </p>
                </div>
              </div>

              {workOrder.notes && (
                <div className="mt-5 rounded-md bg-black p-3">
                  <p className="mb-1 text-sm text-zinc-500">Job Notes</p>
                  <p className="whitespace-pre-wrap text-sm text-zinc-300">
                    {workOrder.notes}
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h2 className="text-lg font-bold text-white">
                Completion
              </h2>

              <label className="mt-4 block text-sm text-zinc-400">
                Completion Notes
              </label>

              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={5}
                className="mt-2 w-full rounded-md border border-zinc-700 bg-black p-3 text-white outline-none focus:border-cyan-500"
                placeholder="Enter work completed, issues found, or follow-up needed..."
              />

              <button
                onClick={handleCompleteWorkOrder}
                disabled={isCompleting}
                className="mt-4 w-full rounded-md bg-cyan-500 px-4 py-3 font-bold text-black hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCompleting ? "Completing..." : "Mark Complete"}
              </button>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}