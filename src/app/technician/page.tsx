"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

type WorkOrder = {
  id: string;
  customerName?: string;
  address?: string;
  serviceTypeName?: string;
  scheduledDate?: string;
  timeWindow?: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  status?: string;
  notes?: string;
  isActive?: boolean;
};

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getStartMinutes(timeWindow?: string) {
  if (!timeWindow) return 9999;

  const startTime = timeWindow.split("-")[0].trim();
  const match = startTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) return 9999;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export default function TechnicianPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const todayString = useMemo(() => formatDateInput(new Date()), []);

  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    try {
      setIsLoading(true);
      setError("");

      if (!currentUser) {
        setError("You must be logged in to view technician work orders.");
        setWorkOrders([]);
        return;
      }

      const workOrdersQuery = query(
        collection(db, "workOrders"),
        where("assignedTechnicianId", "==", currentUser.uid),
        where("scheduledDate", "==", todayString)
      );

      const snap = await getDocs(workOrdersQuery);

      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WorkOrder[];

      const activeWorkOrders = data
        .filter(
          (workOrder) =>
            workOrder.isActive !== false &&
            workOrder.status !== "Closed"
        )
        .sort(
          (a, b) =>
            getStartMinutes(a.timeWindow) -
            getStartMinutes(b.timeWindow)
        );

      setWorkOrders(activeWorkOrders);
    } catch (err) {
      console.error(err);
      setError("Failed to load technician work orders.");
    } finally {
      setIsLoading(false);
    }
  });

  return () => unsubscribe();
}, [todayString]);

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

        <div className="text-right">
          <p className="text-sm text-zinc-400">Technician Portal</p>
          <p className="text-xs text-cyan-400">{todayString}</p>
        </div>
      </header>

      <main className="p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Today's Work Orders</h1>
          <p className="text-sm text-zinc-400">
            {workOrders.length} assigned appointment
            {workOrders.length === 1 ? "" : "s"}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-500 bg-red-950 p-3 text-red-300">
            {error}
          </div>
        )}

        {isLoading ? (
          <p className="text-zinc-400">Loading work orders...</p>
        ) : workOrders.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
            No work orders assigned for today.
          </div>
        ) : (
          <div className="space-y-4">
            {workOrders.map((workOrder) => {
              const status = workOrder.status?.toLowerCase();

              const borderColor =
                status === "verified"
                  ? "border-purple-500"
                  : status === "completed"
                  ? "border-green-500"
                  : "border-blue-500";

              return (
                <Link
                  key={workOrder.id}
                  href={`/technician/work-orders/${workOrder.id}`}
                  className={`block rounded-lg border ${borderColor} bg-zinc-950 p-4`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">
                      {workOrder.timeWindow || "No time window"}
                    </p>

                    <span className="rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
                      {workOrder.status || "Assigned"}
                    </span>
                  </div>

                  <p className="text-lg font-bold text-cyan-400">
                    {workOrder.customerName || "No customer"}
                  </p>

                  <p className="text-sm text-zinc-300">
                    {workOrder.serviceTypeName || "Service"}
                  </p>

                  {workOrder.address && (
                    <p className="mt-2 text-sm text-zinc-400">
                      {workOrder.address}
                    </p>
                  )}

                  {workOrder.notes && (
                    <p className="mt-3 rounded-md bg-black p-3 text-sm text-zinc-400">
                      {workOrder.notes}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}