"use client";

import AppShell from "@/components/AppShell";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type InventoryItem = {
  companyId: string;
  companyName?: string;
  projectId?: string;
  projectName?: string;
  itemName: string;
  category: string;
  sku?: string;
  description?: string;
  minimumStock?: number;
  defaultLocationName?: string;
};

type InventoryUnit = {
  id: string;
  companyId?: string;
  inventoryItemId?: string;
  itemName?: string;
  serialNumber: string;
  status:
    | "available"
    | "assigned"
    | "installed"
    | "damaged"
    | "lost"
    | "returned";
  locationName?: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  workOrderNumber?: string;
};

type Technician = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  companyId?: string;
  role?: string;
  isActive?: boolean;
};

export default function InventoryItemDetailPage() {
  const params = useParams();
  const inventoryItemId = params.id as string;

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const [serialNumbers, setSerialNumbers] = useState("");
  const [locationName, setLocationName] = useState("Main Warehouse");
  const [notes, setNotes] = useState("");

  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);

  async function loadData() {
    if (!inventoryItemId) return;

    setIsLoading(true);

    try {
      const itemRef = doc(db, "inventoryItems", inventoryItemId);
      const itemSnapshot = await getDoc(itemRef);

      if (!itemSnapshot.exists()) {
        setItem(null);
        setUnits([]);
        setTechnicians([]);
        return;
      }

      const itemData = itemSnapshot.data() as InventoryItem;

      setItem(itemData);
      setLocationName(itemData.defaultLocationName || "Main Warehouse");

      const techniciansQuery = query(
        collection(db, "users"),
        where("companyId", "==", itemData.companyId),
        where("role", "==", "Technician"),
        where("isActive", "==", true)
      );

      const unitsQuery = query(
        collection(db, "inventoryUnits"),
        where("inventoryItemId", "==", inventoryItemId)
      );

      const [techniciansSnapshot, unitsSnapshot] = await Promise.all([
        getDocs(techniciansQuery),
        getDocs(unitsQuery),
      ]);

      const techniciansData = techniciansSnapshot.docs.map((document) => ({
        id: document.id,
        ...(document.data() as Omit<Technician, "id">),
      }));

      const unitsData = unitsSnapshot.docs.map((document) => ({
        id: document.id,
        ...(document.data() as Omit<InventoryUnit, "id">),
      }));

      setTechnicians(techniciansData);
      setUnits(unitsData);
    } catch (error) {
      console.error("Error loading inventory item:", error);
      alert("Unable to load inventory item.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [inventoryItemId]);

  const counts = useMemo(() => {
    return {
      available: units.filter((unit) => unit.status === "available").length,
      assigned: units.filter((unit) => unit.status === "assigned").length,
      installed: units.filter((unit) => unit.status === "installed").length,
      damaged: units.filter((unit) => unit.status === "damaged").length,
      lost: units.filter((unit) => unit.status === "lost").length,
      returned: units.filter((unit) => unit.status === "returned").length,
      total: units.length,
    };
  }, [units]);

  const availableUnits = useMemo(() => {
    return units.filter((unit) => unit.status === "available");
  }, [units]);

  function getTechnicianName(technician: Technician) {
    const fullName = `${technician.firstName || ""} ${
      technician.lastName || ""
    }`.trim();

    return fullName || technician.email || "Unnamed Technician";
  }

  function toggleSelectedUnit(unitId: string) {
    setSelectedUnitIds((current) => {
      if (current.includes(unitId)) {
        return current.filter((id) => id !== unitId);
      }

      return [...current, unitId];
    });
  }

  function toggleSelectAllAvailable() {
    const availableIds = availableUnits.map((unit) => unit.id);

    if (selectedUnitIds.length === availableIds.length) {
      setSelectedUnitIds([]);
      return;
    }

    setSelectedUnitIds(availableIds);
  }

  async function handleReceiveUnits(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!item) return;

    const serialList = serialNumbers
      .split("\n")
      .map((serial) => serial.trim())
      .filter(Boolean);

    if (serialList.length === 0) {
      alert("Enter at least one serial number.");
      return;
    }

    const uniqueSerialList = Array.from(new Set(serialList));

    const existingSerials = new Set(
      units.map((unit) => unit.serialNumber.trim().toLowerCase())
    );

    const duplicateExistingSerials = uniqueSerialList.filter((serial) =>
      existingSerials.has(serial.toLowerCase())
    );

    if (duplicateExistingSerials.length > 0) {
      alert(
        `These serial numbers already exist and will not be added:\n\n${duplicateExistingSerials.join(
          "\n"
        )}`
      );
      return;
    }

    if (!locationName.trim()) {
      alert("Location is required.");
      return;
    }

    setIsSaving(true);

    try {
      for (const serialNumber of uniqueSerialList) {
        const unitRef = await addDoc(collection(db, "inventoryUnits"), {
          companyId: item.companyId,
          companyName: item.companyName || "",
          projectId: item.projectId || "",
          projectName: item.projectName || "",
          inventoryItemId,
          itemName: item.itemName,
          serialNumber,
          status: "available",
          locationName: locationName.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await addDoc(collection(db, "inventoryTransactions"), {
          companyId: item.companyId,
          companyName: item.companyName || "",
          projectId: item.projectId || "",
          projectName: item.projectName || "",
          inventoryItemId,
          inventoryUnitId: unitRef.id,
          itemName: item.itemName,
          serialNumber,
          type: "received",
          toLocationName: locationName.trim(),
          notes: notes.trim(),
          createdAt: serverTimestamp(),
        });
      }

      setSerialNumbers("");
      setNotes("");

      await loadData();

      alert("Serialized units received successfully.");
    } catch (error) {
      console.error("Error receiving serialized units:", error);
      alert("Unable to receive serialized units.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAssignSelectedUnits() {
    if (!item) return;

    if (!selectedTechnicianId) {
      alert("Select a technician.");
      return;
    }

    if (selectedUnitIds.length === 0) {
      alert("Select at least one available unit.");
      return;
    }

    const selectedTechnician = technicians.find(
      (technician) => technician.id === selectedTechnicianId
    );

    if (!selectedTechnician) {
      alert("Selected technician was not found.");
      return;
    }

    const selectedTechnicianName = getTechnicianName(selectedTechnician);

    const selectedUnits = units.filter((unit) =>
      selectedUnitIds.includes(unit.id)
    );

    setIsAssigning(true);

    try {
      for (const unit of selectedUnits) {
        if (unit.status !== "available") continue;

        await updateDoc(doc(db, "inventoryUnits", unit.id), {
          status: "assigned",
          assignedTechnicianId: selectedTechnician.id,
          assignedTechnicianName: selectedTechnicianName,
          locationName: "",
          updatedAt: serverTimestamp(),
        });

        await addDoc(collection(db, "inventoryTransactions"), {
          companyId: item.companyId,
          companyName: item.companyName || "",
          projectId: item.projectId || "",
          projectName: item.projectName || "",
          inventoryItemId,
          inventoryUnitId: unit.id,
          itemName: item.itemName,
          serialNumber: unit.serialNumber,
          type: "assigned_to_tech",
          fromLocationName: unit.locationName || "",
          toTechnicianId: selectedTechnician.id,
          toTechnicianName: selectedTechnicianName,
          notes: "Bulk assigned to technician",
          createdAt: serverTimestamp(),
        });
      }

      setSelectedTechnicianId("");
      setSelectedUnitIds([]);

      await loadData();

      alert("Selected units assigned successfully.");
    } catch (error) {
      console.error("Error assigning selected units:", error);
      alert("Unable to assign selected units.");
    } finally {
      setIsAssigning(false);
    }
  }

  function getStatusClass(status: InventoryUnit["status"]) {
    if (status === "available") {
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    }

    if (status === "assigned") {
      return "border-blue-500/40 bg-blue-500/10 text-blue-300";
    }

    if (status === "installed") {
      return "border-cyan-500/40 bg-cyan-500/10 text-cyan-300";
    }

    if (status === "damaged") {
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    }

    if (status === "lost") {
      return "border-red-500/40 bg-red-500/10 text-red-300";
    }

    return "border-slate-500/40 bg-slate-500/10 text-slate-300";
  }

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-slate-400">Loading inventory item...</p>
      </AppShell>
    );
  }

  if (!item) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Link href="/inventory" className="text-sm text-cyan-400">
            ← Back to Inventory
          </Link>

          <p className="text-sm text-slate-400">Inventory item not found.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Link href="/inventory" className="text-sm text-cyan-400">
            ← Back to Inventory
          </Link>

          <h1 className="mt-3 text-2xl font-semibold text-white">
            {item.itemName}
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            {item.category}
            {item.sku ? ` • ${item.sku}` : ""}
            {item.companyName ? ` • ${item.companyName}` : ""}
          </p>

          {item.description ? (
            <p className="mt-2 text-sm text-slate-400">{item.description}</p>
          ) : null}
        </div>

        <section className="grid gap-4 md:grid-cols-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-400">Available</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {counts.available}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-400">Assigned</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {counts.assigned}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-400">Installed</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {counts.installed}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-400">Damaged</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {counts.damaged}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-400">Lost</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {counts.lost}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-400">Total</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {counts.total}
            </p>
          </div>
        </section>

        <form
          onSubmit={handleReceiveUnits}
          className="rounded-xl border border-slate-800 bg-slate-900/70 p-5"
        >
          <h2 className="text-lg font-semibold text-white">
            Receive Serialized Units
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Paste one serial number per line. Each serial number will create one
            inventory unit.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Location *
              </span>
              <input
                value={locationName}
                onChange={(event) => setLocationName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                placeholder="Main Warehouse"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">Notes</span>
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                placeholder="Optional receiving notes"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-300">
                Serial Numbers *
              </span>
              <textarea
                value={serialNumbers}
                onChange={(event) => setSerialNumbers(event.target.value)}
                rows={8}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                placeholder={`X2S-1001
X2S-1002
X2S-1003`}
              />
            </label>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Receiving..." : "Receive Units"}
            </button>
          </div>
        </form>

        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold text-white">
            Assign Units to Technician
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Select one technician and assign multiple available serial numbers
            at once.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Technician
              </span>
              <select
                value={selectedTechnicianId}
                onChange={(event) =>
                  setSelectedTechnicianId(event.target.value)
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
              >
                <option value="">Select technician</option>
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {getTechnicianName(technician)}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end gap-3">
              <button
                type="button"
                onClick={toggleSelectAllAvailable}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Select All Available
              </button>

              <button
                type="button"
                onClick={handleAssignSelectedUnits}
                disabled={isAssigning}
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAssigning
                  ? "Assigning..."
                  : `Assign Selected (${selectedUnitIds.length})`}
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-800">
            {availableUnits.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">
                No available units to assign.
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                {availableUnits.map((unit) => (
                  <label
                    key={unit.id}
                    className="flex cursor-pointer items-center justify-between border-b border-slate-800 px-4 py-3 text-sm hover:bg-slate-800/60"
                  >
                    <div>
                      <p className="font-medium text-white">
                        {unit.serialNumber}
                      </p>
                      <p className="text-xs text-slate-500">
                        {unit.locationName || "No location"}
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={selectedUnitIds.includes(unit.id)}
                      onChange={() => toggleSelectedUnit(unit.id)}
                      className="h-4 w-4"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold text-white">
            Serialized Units
          </h2>

          {units.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              No serialized units have been received for this item yet.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2 pr-4">Serial Number</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Location</th>
                    <th className="py-2 pr-4">Technician</th>
                    <th className="py-2 pr-4">Work Order</th>
                  </tr>
                </thead>

                <tbody>
                  {units.map((unit) => (
                    <tr
                      key={unit.id}
                      className="border-b border-slate-800 text-slate-200"
                    >
                      <td className="py-3 pr-4 font-medium">
                        <Link
                          href={`/inventory/units/${unit.id}`}
                          className="text-cyan-400 hover:text-cyan-300"
                        >
                          {unit.serialNumber}
                        </Link>
                      </td>

                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-medium ${getStatusClass(
                            unit.status
                          )}`}
                        >
                          {unit.status}
                        </span>
                      </td>

                      <td className="py-3 pr-4">
                        {unit.locationName || "—"}
                      </td>

                      <td className="py-3 pr-4">
                        {unit.assignedTechnicianName || "—"}
                      </td>

                      <td className="py-3 pr-4">
                        {unit.workOrderNumber || "—"}
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