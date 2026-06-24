"use client";

import AppShell from "@/components/AppShell";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type UserProfile = {
  companyId?: string;
  role?: string;
  isSystemAdmin?: boolean;
};

type InventoryItem = {
  id: string;
  companyId: string;
  companyName?: string;
  projectId?: string;
  projectName?: string;
  itemName: string;
  category: string;
  sku?: string;
  minimumStock?: number;
  defaultLocationName?: string;
  isActive?: boolean;
};

type InventoryUnit = {
  id: string;
  companyId: string;
  inventoryItemId: string;
  itemName?: string;
  serialNumber?: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  status:
    | "available"
    | "assigned"
    | "installed"
    | "damaged"
    | "lost"
    | "returned";
};

export default function InventoryPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadInventory(profile: UserProfile) {
    setIsLoading(true);

    try {
      const isSystemAdmin =
        profile.isSystemAdmin === true || profile.role === "System Admin";

      const itemsQuery = isSystemAdmin
        ? query(collection(db, "inventoryItems"), orderBy("itemName", "asc"))
        : query(
            collection(db, "inventoryItems"),
            where("companyId", "==", profile.companyId || ""),
            orderBy("itemName", "asc")
          );

      const unitsQuery = isSystemAdmin
        ? query(collection(db, "inventoryUnits"))
        : query(
            collection(db, "inventoryUnits"),
            where("companyId", "==", profile.companyId || "")
          );

      const [itemsSnapshot, unitsSnapshot] = await Promise.all([
        getDocs(itemsQuery),
        getDocs(unitsQuery),
      ]);

      const itemsData = itemsSnapshot.docs.map((document) => ({
        id: document.id,
        ...(document.data() as Omit<InventoryItem, "id">),
      }));

      const unitsData = unitsSnapshot.docs.map((document) => ({
        id: document.id,
        ...(document.data() as Omit<InventoryUnit, "id">),
      }));

      setItems(itemsData);
      setUnits(unitsData);
    } catch (error) {
      console.error("Error loading inventory:", error);
      alert("Unable to load inventory.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserProfile(null);
        setItems([]);
        setUnits([]);
        setIsLoading(false);
        return;
      }

      try {
        const userSnapshot = await getDoc(doc(db, "users", user.uid));

        if (!userSnapshot.exists()) {
          setUserProfile(null);
          setItems([]);
          setUnits([]);
          setIsLoading(false);
          return;
        }

        const profile = userSnapshot.data() as UserProfile;
        setUserProfile(profile);

        await loadInventory(profile);
      } catch (error) {
        console.error("Error loading user profile:", error);
        alert("Unable to load your user profile.");
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const inventoryRows = useMemo(() => {
    return items.map((item) => {
      const itemUnits = units.filter((unit) => unit.inventoryItemId === item.id);

      const available = itemUnits.filter(
        (unit) => unit.status === "available"
      ).length;

      const assigned = itemUnits.filter(
        (unit) => unit.status === "assigned"
      ).length;

      const installed = itemUnits.filter(
        (unit) => unit.status === "installed"
      ).length;

      const damaged = itemUnits.filter(
        (unit) => unit.status === "damaged"
      ).length;

      const lost = itemUnits.filter((unit) => unit.status === "lost").length;

      const returned = itemUnits.filter(
        (unit) => unit.status === "returned"
      ).length;

      const minimumStock = item.minimumStock || 0;
      const isLowStock = minimumStock > 0 && available < minimumStock;

      return {
        ...item,
        available,
        assigned,
        installed,
        damaged,
        lost,
        returned,
        total: itemUnits.length,
        isLowStock,
      };
    });
  }, [items, units]);

  const assignedByTechnician = useMemo(() => {
    const assignedUnits = units.filter((unit) => unit.status === "assigned");

    return assignedUnits.reduce<Record<string, InventoryUnit[]>>(
      (groups, unit) => {
        const technicianName =
          unit.assignedTechnicianName || "Unassigned Technician";

        if (!groups[technicianName]) {
          groups[technicianName] = [];
        }

        groups[technicianName].push(unit);

        return groups;
      },
      {}
    );
  }, [units]);

  const totalAvailable = units.filter(
    (unit) => unit.status === "available"
  ).length;

  const totalAssigned = units.filter(
    (unit) => unit.status === "assigned"
  ).length;

  const totalLowStock = inventoryRows.filter((item) => item.isLowStock).length;

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-slate-400">Loading inventory...</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Inventory</h1>
          <p className="mt-1 text-sm text-slate-400">
            View serialized inventory item types, stock levels, and device
            status.
          </p>
        </div>

        {!userProfile ? (
          <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">
              Unable to load your user profile.
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">Item Types</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {items.length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">Available Units</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {totalAvailable}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">Assigned Units</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {totalAssigned}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">Low Stock Items</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {totalLowStock}
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Inventory Items
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Item types are created in System Admin. This page tracks the
                    serialized units under each item.
                  </p>
                </div>
              </div>

              {inventoryRows.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">
                  No inventory items have been created yet.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-800 text-slate-400">
                      <tr>
                        <th className="py-2 pr-4">Item</th>
                        <th className="py-2 pr-4">Category</th>
                        <th className="py-2 pr-4">SKU</th>
                        <th className="py-2 pr-4">Available</th>
                        <th className="py-2 pr-4">Assigned</th>
                        <th className="py-2 pr-4">Installed</th>
                        <th className="py-2 pr-4">Damaged</th>
                        <th className="py-2 pr-4">Lost</th>
                        <th className="py-2 pr-4">Returned</th>
                        <th className="py-2 pr-4">Minimum</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {inventoryRows.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-800 text-slate-200"
                        >
                          <td className="py-3 pr-4 font-medium text-white">
                            {item.itemName}
                            {item.companyName ? (
                              <div className="text-xs font-normal text-slate-500">
                                {item.companyName}
                              </div>
                            ) : null}
                          </td>

                          <td className="py-3 pr-4">{item.category}</td>
                          <td className="py-3 pr-4">{item.sku || "—"}</td>
                          <td className="py-3 pr-4">{item.available}</td>
                          <td className="py-3 pr-4">{item.assigned}</td>
                          <td className="py-3 pr-4">{item.installed}</td>
                          <td className="py-3 pr-4">{item.damaged}</td>
                          <td className="py-3 pr-4">{item.lost}</td>
                          <td className="py-3 pr-4">{item.returned}</td>
                          <td className="py-3 pr-4">
                            {item.minimumStock || 0}
                          </td>

                          <td className="py-3 pr-4">
                            {item.isLowStock ? (
                              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-300">
                                Low Stock
                              </span>
                            ) : (
                              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">
                                OK
                              </span>
                            )}
                          </td>

                          <td className="py-3 pr-4">
                            <Link
                              href={`/inventory/${item.id}`}
                              className="text-cyan-400 hover:text-cyan-300"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold text-white">
                Assigned Inventory by Technician
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                View serialized inventory currently assigned to technicians.
              </p>

              {Object.keys(assignedByTechnician).length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">
                  No inventory is currently assigned to technicians.
                </p>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {Object.entries(assignedByTechnician).map(
                    ([technicianName, technicianUnits]) => (
                      <div
                        key={technicianName}
                        className="rounded-lg border border-slate-800 bg-black/40 p-4"
                      >
                        <div>
                          <h3 className="font-semibold text-white">
                            {technicianName}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {technicianUnits.length} assigned unit
                            {technicianUnits.length === 1 ? "" : "s"}
                          </p>
                        </div>

                        <div className="mt-4 space-y-2">
                          {technicianUnits.map((unit) => (
                            <Link
                              key={unit.id}
                              href={`/inventory/units/${unit.id}`}
                              className="block rounded-md border border-slate-800 bg-slate-950 p-3 hover:border-cyan-500/50"
                            >
                              <p className="text-sm font-medium text-white">
                                {unit.itemName || "Inventory Item"}
                              </p>
                              <p className="mt-1 text-sm text-cyan-400">
                                {unit.serialNumber || "No serial number"}
                              </p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}