"use client";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type InventoryUnit = {
  id: string;
  itemName?: string;
  serialNumber: string;
  status: "assigned" | "installed" | "available" | "damaged" | "lost" | "returned";
  locationName?: string;
  workOrderId?: string;
  workOrderNumber?: string;
};

export default function TechnicianInventoryPage() {
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUnits([]);
        setIsLoading(false);
        return;
      }

      try {
        const inventoryQuery = query(
          collection(db, "inventoryUnits"),
          where("assignedTechnicianId", "==", user.uid),
          where("status", "==", "assigned")
        );

        const inventorySnapshot = await getDocs(inventoryQuery);

        const inventoryData = inventorySnapshot.docs.map((document) => ({
          id: document.id,
          ...(document.data() as Omit<InventoryUnit, "id">),
        }));

        setUnits(inventoryData);
      } catch (error) {
        console.error("Error loading technician inventory:", error);
        alert("Unable to load technician inventory.");
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const groupedInventory = useMemo(() => {
    return units.reduce<Record<string, InventoryUnit[]>>((groups, unit) => {
      const itemName = unit.itemName || "Inventory Item";

      if (!groups[itemName]) {
        groups[itemName] = [];
      }

      groups[itemName].push(unit);

      return groups;
    }, {});
  }, [units]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-black p-4 text-white">
        <p className="text-sm text-zinc-400">Loading inventory...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-4 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link href="/technician" className="text-sm text-cyan-400">
            ← Back to Technician Home
          </Link>

          <h1 className="mt-4 text-2xl font-semibold">
            My Assigned Inventory
          </h1>

          <p className="mt-1 text-sm text-zinc-400">
            Serialized inventory currently assigned to you.
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs text-zinc-500">Assigned Units</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {units.length}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs text-zinc-500">Item Types</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {Object.keys(groupedInventory).length}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs text-zinc-500">Status</p>
            <p className="mt-2 text-lg font-semibold text-cyan-300">
              Active
            </p>
          </div>
        </section>

        {units.length === 0 ? (
          <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-400">
              You do not currently have any assigned inventory.
            </p>
          </section>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedInventory).map(([itemName, itemUnits]) => (
              <section
                key={itemName}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {itemName}
                    </h2>
                    <p className="text-sm text-zinc-500">
                      {itemUnits.length} assigned
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {itemUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className="rounded-lg border border-zinc-800 bg-black p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm text-zinc-500">
                            Serial Number
                          </p>
                          <p className="text-lg font-semibold text-white">
                            {unit.serialNumber}
                          </p>
                        </div>

                        <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
                          {unit.status}
                        </span>
                      </div>

                      {unit.workOrderNumber ? (
                        <p className="mt-3 text-sm text-zinc-400">
                          Work Order: {unit.workOrderNumber}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}