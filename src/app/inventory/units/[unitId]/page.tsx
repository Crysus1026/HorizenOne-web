"use client";

import AppShell from "@/components/AppShell";
import { db } from "@/lib/firebase";
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
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type InventoryUnit = {
  id: string;
  inventoryItemId?: string;
  itemName?: string;
  serialNumber: string;
  status: string;
  locationName?: string;
  assignedTechnicianName?: string;
  workOrderNumber?: string;
};

type InventoryTransaction = {
  id: string;
  type: string;
  itemName?: string;
  serialNumber?: string;
  fromLocationName?: string;
  toLocationName?: string;
  toTechnicianName?: string;
  fromTechnicianName?: string;
  workOrderNumber?: string;
  notes?: string;
  createdAt?: {
    seconds: number;
    nanoseconds: number;
  };
};

function formatDate(timestamp?: { seconds: number; nanoseconds: number }) {
  if (!timestamp?.seconds) return "—";

  return new Date(timestamp.seconds * 1000).toLocaleString();
}

function formatTransactionType(type: string) {
  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function InventoryUnitHistoryPage() {
  const params = useParams();
  const unitId = params.unitId as string;

  const [unit, setUnit] = useState<InventoryUnit | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadData() {
    if (!unitId) return;

    setIsLoading(true);

    try {
      const unitSnapshot = await getDoc(doc(db, "inventoryUnits", unitId));

      if (!unitSnapshot.exists()) {
        setUnit(null);
        setTransactions([]);
        return;
      }

      const unitData = {
        id: unitSnapshot.id,
        ...(unitSnapshot.data() as Omit<InventoryUnit, "id">),
      };

      setUnit(unitData);

      const transactionsQuery = query(
        collection(db, "inventoryTransactions"),
        where("inventoryUnitId", "==", unitId),
        orderBy("createdAt", "desc")
      );

      const transactionsSnapshot = await getDocs(transactionsQuery);

      const transactionsData = transactionsSnapshot.docs.map((document) => ({
        id: document.id,
        ...(document.data() as Omit<InventoryTransaction, "id">),
      }));

      setTransactions(transactionsData);
    } catch (error) {
      console.error("Error loading inventory unit history:", error);
      alert("Unable to load inventory unit history.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [unitId]);

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-slate-400">Loading unit history...</p>
      </AppShell>
    );
  }

  if (!unit) {
    return (
      <AppShell>
        <p className="text-sm text-slate-400">Inventory unit not found.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Link
            href={`/inventory/${unit.inventoryItemId || ""}`}
            className="text-sm text-cyan-400 hover:text-cyan-300"
          >
            ← Back to Item
          </Link>

          <h1 className="mt-3 text-2xl font-semibold text-white">
            {unit.serialNumber}
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            {unit.itemName || "Inventory Unit"}
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-400">Status</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {unit.status}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-400">Location</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {unit.locationName || "—"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-400">Technician</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {unit.assignedTechnicianName || "—"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-400">Work Order</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {unit.workOrderNumber || "—"}
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold text-white">
            Transaction History
          </h2>

          {transactions.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              No transaction history found.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">From</th>
                    <th className="py-2 pr-4">To</th>
                    <th className="py-2 pr-4">Work Order</th>
                    <th className="py-2 pr-4">Notes</th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b border-slate-800 text-slate-200"
                    >
                      <td className="py-3 pr-4">
                        {formatDate(transaction.createdAt)}
                      </td>

                      <td className="py-3 pr-4 font-medium text-white">
                        {formatTransactionType(transaction.type)}
                      </td>

                      <td className="py-3 pr-4">
                        {transaction.fromLocationName ||
                          transaction.fromTechnicianName ||
                          "—"}
                      </td>

                      <td className="py-3 pr-4">
                        {transaction.toLocationName ||
                          transaction.toTechnicianName ||
                          "—"}
                      </td>

                      <td className="py-3 pr-4">
                        {transaction.workOrderNumber || "—"}
                      </td>

                      <td className="py-3 pr-4">
                        {transaction.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}