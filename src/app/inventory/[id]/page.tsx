"use client";

import AppShell from "@/components/AppShell";
import type { InventoryBalance } from "@/features/inventory/types/inventoryBalance";
import type { InventoryItem } from "@/features/inventory/types/inventoryItem";
import type { InventoryUnit } from "@/features/inventory/types/inventoryUnit";
import {
  assignQuantityInventory,
  assignSerializedUnits,
  getInventoryItemDetail,
  receiveQuantityInventory,
  receiveSerializedUnits,
  updateSerializedUnitStatus,
} from "@/features/inventory/services/inventoryItemDetailService";
import { formatCurrencyFromCents } from "@/features/inventory/utils/inventoryValue";
import type { Technician } from "@/features/technicians/types/technician";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

const SERIALIZED_UNITS_PAGE_SIZE = 15;

export default function InventoryItemDetailPage() {
  const params = useParams();
  const inventoryItemId = params.id as string;

  const [item, setItem] =
    useState<InventoryItem | null>(null);

  const [units, setUnits] =
    useState<InventoryUnit[]>([]);

  const [balances, setBalances] =
    useState<InventoryBalance[]>([]);

  const [technicians, setTechnicians] =
    useState<Technician[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  /*
   * SERIALIZED RECEIVING
   */

  const [serialNumbers, setSerialNumbers] =
    useState("");

  const [locationName, setLocationName] =
    useState("Main Warehouse");

  const [notes, setNotes] =
    useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  /*
   * SERIALIZED ASSIGNMENT
   */

  const [
    selectedTechnicianId,
    setSelectedTechnicianId,
  ] = useState("");

  const [
    selectedUnitIds,
    setSelectedUnitIds,
  ] = useState<string[]>([]);

  const [assignSearch, setAssignSearch] =
    useState("");

  const [isAssigning, setIsAssigning] =
    useState(false);

  /*
   * SERIALIZED STATUS
   */

  const [
    statusActionUnitId,
    setStatusActionUnitId,
  ] = useState("");

  const [
    statusActionNotes,
    setStatusActionNotes,
  ] = useState("");

  const [
    isUpdatingStatus,
    setIsUpdatingStatus,
  ] = useState(false);

  /*
   * SERIALIZED SEARCH / FILTERS
   */

  const [serialSearch, setSerialSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [
    technicianFilter,
    setTechnicianFilter,
  ] = useState("all");

  const [
    serializedUnitsPage,
    setSerializedUnitsPage,
  ] = useState(1);

  /*
   * QUANTITY RECEIVING
   */

  const [
    quantityReceiveAmount,
    setQuantityReceiveAmount,
  ] = useState("");

  const [
    quantityReceiveNotes,
    setQuantityReceiveNotes,
  ] = useState("");

  const [
    isQuantityReceiving,
    setIsQuantityReceiving,
  ] = useState(false);

  /*
   * QUANTITY ASSIGNMENT
   */

  const [
    quantityAssignAmount,
    setQuantityAssignAmount,
  ] = useState("");

  const [
    quantityAssignLocation,
    setQuantityAssignLocation,
  ] = useState("");

  const [
    quantityAssignNotes,
    setQuantityAssignNotes,
  ] = useState("");

  const [
    isQuantityAssigning,
    setIsQuantityAssigning,
  ] = useState(false);

  /*
   * LOAD INVENTORY ITEM
   */

  async function loadData() {
    if (!inventoryItemId) {
      setItem(null);
      setUnits([]);
      setBalances([]);
      setTechnicians([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const detailData =
        await getInventoryItemDetail(
          inventoryItemId
        );

      setItem(detailData.item);
      setUnits(detailData.units);
      setBalances(detailData.balances);
      setTechnicians(
        detailData.technicians
      );

      if (detailData.item) {
        setLocationName(
          "Main Warehouse"
        );
      }
    } catch (error) {
      console.error(
        "Error loading inventory item:",
        error
      );

      setItem(null);
      setUnits([]);
      setBalances([]);
      setTechnicians([]);

      const message =
        error instanceof Error
          ? error.message
          : "Unknown inventory loading error.";

      alert(
        `Unable to load inventory item: ${message}`
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [inventoryItemId]);

  /*
   * SERIALIZED COUNTS
   */

  const counts = useMemo(() => {
    return {
      available: units.filter(
        (unit) =>
          unit.status === "available"
      ).length,

      assigned: units.filter(
        (unit) =>
          unit.status === "assigned"
      ).length,

      installed: units.filter(
        (unit) =>
          unit.status === "installed"
      ).length,

      damaged: units.filter(
        (unit) =>
          unit.status === "damaged"
      ).length,

      lost: units.filter(
        (unit) =>
          unit.status === "lost"
      ).length,

      returned: units.filter(
        (unit) =>
          unit.status === "returned"
      ).length,

      total: units.length,
    };
  }, [units]);

  /*
   * QUANTITY COUNTS
   */

  const quantityCounts =
    useMemo(() => {
      const warehouse =
        balances
          .filter(
            (balance) =>
              balance.locationType ===
              "warehouse"
          )
          .reduce(
            (total, balance) =>
              total +
              balance.quantity,
            0
          );

      const assigned =
        balances
          .filter(
            (balance) =>
              balance.locationType ===
              "technician"
          )
          .reduce(
            (total, balance) =>
              total +
              balance.quantity,
            0
          );

      const total =
        warehouse + assigned;

      return {
        warehouse,
        assigned,
        total,

        totalValueCents:
          total *
          (item
            ?.standardUnitValueCents ??
            0),
      };
    }, [balances, item]);

  const warehouseBalances =
    useMemo(() => {
      return balances
        .filter(
          (balance) =>
            balance.locationType ===
              "warehouse" &&
            balance.quantity > 0
        )
        .sort((a, b) =>
          a.locationName.localeCompare(
            b.locationName
          )
        );
    }, [balances]);

  /*
   * Keep quantity source location valid.
   */

  useEffect(() => {
    if (
      warehouseBalances.length === 0
    ) {
      setQuantityAssignLocation("");
      return;
    }

    const currentStillExists =
      warehouseBalances.some(
        (balance) =>
          balance.locationName ===
          quantityAssignLocation
      );

    if (!currentStillExists) {
      setQuantityAssignLocation(
        warehouseBalances[0]
          .locationName
      );
    }
  }, [
    warehouseBalances,
    quantityAssignLocation,
  ]);

  /*
   * SERIALIZED ASSIGNMENT FILTERING
   */

  const assignableUnits =
    useMemo(() => {
      return units.filter(
        (unit) =>
          unit.status ===
            "available" ||
          unit.status ===
            "returned"
      );
    }, [units]);

  const filteredAssignableUnits =
    useMemo(() => {
      const search =
        assignSearch
          .trim()
          .toLowerCase();

      if (!search) {
        return [];
      }

      return assignableUnits.filter(
        (unit) =>
          unit.serialNumber
            .toLowerCase()
            .includes(search) ||
          unit.locationName
            ?.toLowerCase()
            .includes(search) ||
          unit.itemName
            ?.toLowerCase()
            .includes(search)
      );
    }, [
      assignableUnits,
      assignSearch,
    ]);

  const technicianFilterOptions =
    useMemo(() => {
      const technicianMap =
        new Map<string, string>();

      units.forEach((unit) => {
        if (
          unit.assignedTechnicianId &&
          unit.assignedTechnicianName
        ) {
          technicianMap.set(
            unit.assignedTechnicianId,
            unit.assignedTechnicianName
          );
        }
      });

      return Array.from(
        technicianMap.entries()
      )
        .map(([id, name]) => ({
          id,
          name,
        }))
        .sort((a, b) =>
          a.name.localeCompare(b.name)
        );
    }, [units]);

  const filteredUnits =
    useMemo(() => {
      const normalizedSearch =
        serialSearch
          .trim()
          .toLowerCase();

      return units.filter(
        (unit) => {
          const matchesSerial =
            !normalizedSearch ||
            unit.serialNumber
              .toLowerCase()
              .includes(
                normalizedSearch
              );

          const matchesStatus =
            statusFilter === "all" ||
            unit.status ===
              statusFilter;

          const matchesTechnician =
            technicianFilter ===
              "all" ||
            (technicianFilter ===
              "unassigned" &&
              !unit.assignedTechnicianId) ||
            unit.assignedTechnicianId ===
              technicianFilter;

          return (
            matchesSerial &&
            matchesStatus &&
            matchesTechnician
          );
        }
      );
    }, [
      units,
      serialSearch,
      statusFilter,
      technicianFilter,
    ]);

  const totalSerializedUnitPages =
    Math.max(
      1,
      Math.ceil(
        filteredUnits.length /
          SERIALIZED_UNITS_PAGE_SIZE
      )
    );

  const paginatedUnits =
    useMemo(() => {
      const startIndex =
        (serializedUnitsPage - 1) *
        SERIALIZED_UNITS_PAGE_SIZE;

      return filteredUnits.slice(
        startIndex,
        startIndex +
          SERIALIZED_UNITS_PAGE_SIZE
      );
    }, [
      filteredUnits,
      serializedUnitsPage,
    ]);

  useEffect(() => {
    setSerializedUnitsPage(1);
  }, [
    serialSearch,
    statusFilter,
    technicianFilter,
  ]);

  useEffect(() => {
    if (
      serializedUnitsPage >
      totalSerializedUnitPages
    ) {
      setSerializedUnitsPage(
        totalSerializedUnitPages
      );
    }
  }, [
    serializedUnitsPage,
    totalSerializedUnitPages,
  ]);

  /*
   * HELPERS
   */

  function getTechnicianName(
    technician: Technician
  ) {
    const fullName =
      `${technician.firstName || ""} ${
        technician.lastName || ""
      }`.trim();

    return (
      fullName ||
      technician.email ||
      "Unnamed Technician"
    );
  }

  function toggleSelectedUnit(
    unitId: string
  ) {
    setSelectedUnitIds(
      (current) => {
        if (
          current.includes(unitId)
        ) {
          return current.filter(
            (id) => id !== unitId
          );
        }

        return [
          ...current,
          unitId,
        ];
      }
    );
  }

  function toggleSelectAllAvailable() {
    const resultIds =
      filteredAssignableUnits.map(
        (unit) => unit.id
      );

    const allResultsSelected =
      resultIds.length > 0 &&
      resultIds.every((id) =>
        selectedUnitIds.includes(id)
      );

    if (allResultsSelected) {
      setSelectedUnitIds(
        (current) =>
          current.filter(
            (id) =>
              !resultIds.includes(id)
          )
      );

      return;
    }

    setSelectedUnitIds(
      (current) =>
        Array.from(
          new Set([
            ...current,
            ...resultIds,
          ])
        )
    );
  }

  /*
   * SERIALIZED RECEIVING
   */

  async function handleReceiveUnits(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!item) return;

    const serialList =
      serialNumbers
        .split("\n")
        .map((serialNumber) =>
          serialNumber.trim()
        )
        .filter(Boolean);

    if (serialList.length === 0) {
      alert(
        "Enter at least one serial number."
      );
      return;
    }

    const uniqueSerialList =
      Array.from(
        new Set(serialList)
      );

    const existingSerials =
      new Set(
        units.map((unit) =>
          unit.serialNumber
            .trim()
            .toLowerCase()
        )
      );

    const duplicateExistingSerials =
      uniqueSerialList.filter(
        (serialNumber) =>
          existingSerials.has(
            serialNumber.toLowerCase()
          )
      );

    if (
      duplicateExistingSerials.length >
      0
    ) {
      alert(
        `These serial numbers already exist and will not be added:\n\n${duplicateExistingSerials.join(
          "\n"
        )}`
      );

      return;
    }

    if (!locationName.trim()) {
      alert(
        "Location is required."
      );
      return;
    }

    setIsSaving(true);

    try {
      await receiveSerializedUnits(
        {
          item,
          inventoryItemId,
          serialNumbers:
            uniqueSerialList,
          locationName,
          notes,
        }
      );

      setSerialNumbers("");
      setNotes("");

      await loadData();

      alert(
        "Serialized units received successfully."
      );
    } catch (error) {
      console.error(
        "Error receiving serialized units:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to receive serialized units.";

      alert(message);
    } finally {
      setIsSaving(false);
    }
  }

  /*
   * SERIALIZED ASSIGNMENT
   */

  async function handleAssignSelectedUnits() {
    if (!item) return;

    if (!selectedTechnicianId) {
      alert(
        "Select a technician."
      );
      return;
    }

    if (
      selectedUnitIds.length === 0
    ) {
      alert(
        "Select at least one available unit."
      );
      return;
    }

    const selectedTechnician =
      technicians.find(
        (technician) =>
          technician.id ===
          selectedTechnicianId
      );

    if (!selectedTechnician) {
      alert(
        "Selected technician was not found."
      );
      return;
    }

    const selectedTechnicianName =
      getTechnicianName(
        selectedTechnician
      );

    const selectedUnits =
      units.filter((unit) =>
        selectedUnitIds.includes(
          unit.id
        )
      );

    const confirmed =
      window.confirm(
        `Assign ${selectedUnits.length} unit${
          selectedUnits.length === 1
            ? ""
            : "s"
        } to ${selectedTechnicianName}?`
      );

    if (!confirmed) return;

    setIsAssigning(true);

    try {
      const assignedCount =
        await assignSerializedUnits(
          {
            item,
            inventoryItemId,
            units:
              selectedUnits,
            technician:
              selectedTechnician,
            technicianName:
              selectedTechnicianName,
          }
        );

      setSelectedTechnicianId(
        ""
      );

      setSelectedUnitIds([]);
      setAssignSearch("");

      await loadData();

      alert(
        `${assignedCount} unit${
          assignedCount === 1
            ? ""
            : "s"
        } assigned to ${selectedTechnicianName}.`
      );
    } catch (error) {
      console.error(
        "Error assigning selected units:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to assign selected units.";

      alert(message);
    } finally {
      setIsAssigning(false);
    }
  }

  /*
   * SERIALIZED STATUS UPDATE
   */

  async function handleUpdateUnitStatus(
    unit: InventoryUnit,
    newStatus:
      | "installed"
      | "damaged"
      | "lost"
      | "returned"
  ) {
    if (!item) return;

    const confirmMessage =
      newStatus === "returned"
        ? `Mark ${unit.serialNumber} as RTU / returned?`
        : newStatus ===
            "installed"
          ? `Mark ${unit.serialNumber} as installed and remove it from the technician's inventory?`
          : `Mark ${unit.serialNumber} as ${newStatus}?`;

    const confirmed =
      window.confirm(
        confirmMessage
      );

    if (!confirmed) return;

    setIsUpdatingStatus(true);

    setStatusActionUnitId(
      unit.id
    );

    try {
      await updateSerializedUnitStatus(
        {
          item,
          inventoryItemId,
          unit,
          newStatus,
          notes:
            statusActionNotes,
        }
      );

      setStatusActionNotes("");

      await loadData();
    } catch (error) {
      console.error(
        "Error updating unit status:",
        error
      );

      alert(
        "Unable to update unit status."
      );
    } finally {
      setStatusActionUnitId("");
      setIsUpdatingStatus(false);
    }
  }

  /*
   * QUANTITY RECEIVING
   */

  async function handleReceiveQuantity(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!item) return;

    const quantity = Number(
      quantityReceiveAmount
    );

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      alert(
        "Enter a quantity greater than zero."
      );
      return;
    }

    if (!locationName.trim()) {
      alert(
        "Location is required."
      );
      return;
    }

    setIsQuantityReceiving(
      true
    );

    try {
      await receiveQuantityInventory(
        {
          item,
          inventoryItemId,
          quantity,
          locationName,
          notes:
            quantityReceiveNotes,
        }
      );

      setQuantityReceiveAmount(
        ""
      );

      setQuantityReceiveNotes(
        ""
      );

      await loadData();

      alert(
        `${Math.floor(quantity)} ${
          item.unitOfMeasure ||
          "units"
        } received successfully.`
      );
    } catch (error) {
      console.error(
        "Error receiving quantity inventory:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to receive inventory.";

      alert(message);
    } finally {
      setIsQuantityReceiving(
        false
      );
    }
  }

  /*
   * QUANTITY ASSIGNMENT
   */

  async function handleAssignQuantity() {
    if (!item) return;

    if (
      !selectedTechnicianId
    ) {
      alert(
        "Select a technician."
      );
      return;
    }

    if (
      !quantityAssignLocation
    ) {
      alert(
        "Select a source location."
      );
      return;
    }

    const quantity = Number(
      quantityAssignAmount
    );

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      alert(
        "Enter a quantity greater than zero."
      );
      return;
    }

    const selectedTechnician =
      technicians.find(
        (technician) =>
          technician.id ===
          selectedTechnicianId
      );

    if (!selectedTechnician) {
      alert(
        "Selected technician was not found."
      );
      return;
    }

    const selectedTechnicianName =
      getTechnicianName(
        selectedTechnician
      );

    const sourceBalance =
      warehouseBalances.find(
        (balance) =>
          balance.locationName ===
          quantityAssignLocation
      );

    if (!sourceBalance) {
      alert(
        "The selected warehouse balance was not found."
      );
      return;
    }

    if (
      quantity >
      sourceBalance.quantity
    ) {
      alert(
        `Only ${sourceBalance.quantity} ${
          item.unitOfMeasure ||
          "units"
        } are available at ${sourceBalance.locationName}.`
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Assign ${Math.floor(
          quantity
        )} ${
          item.unitOfMeasure ||
          "units"
        } to ${selectedTechnicianName}?`
      );

    if (!confirmed) return;

    setIsQuantityAssigning(
      true
    );

    try {
      await assignQuantityInventory(
        {
          item,
          inventoryItemId,
          technician:
            selectedTechnician,
          technicianName:
            selectedTechnicianName,
          quantity,
          fromLocationName:
            quantityAssignLocation,
          notes:
            quantityAssignNotes,
        }
      );

      setSelectedTechnicianId(
        ""
      );

      setQuantityAssignAmount(
        ""
      );

      setQuantityAssignNotes(
        ""
      );

      await loadData();

      alert(
        `${Math.floor(quantity)} ${
          item.unitOfMeasure ||
          "units"
        } assigned to ${selectedTechnicianName}.`
      );
    } catch (error) {
      console.error(
        "Error assigning quantity inventory:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to assign inventory.";

      alert(message);
    } finally {
      setIsQuantityAssigning(
        false
      );
    }
  }

  function getStatusClass(
    status: InventoryUnit["status"]
  ) {
    if (
      status === "available"
    ) {
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    }

    if (
      status === "assigned"
    ) {
      return "border-blue-500/40 bg-blue-500/10 text-blue-300";
    }

    if (
      status === "installed"
    ) {
      return "border-cyan-500/40 bg-cyan-500/10 text-cyan-300";
    }

    if (
      status === "damaged"
    ) {
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    }

    if (status === "lost") {
      return "border-red-500/40 bg-red-500/10 text-red-300";
    }

    return "border-slate-500/40 bg-slate-500/10 text-slate-300";
  }

  /*
   * LOADING STATES
   */

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-slate-400">
          Loading inventory item...
        </p>
      </AppShell>
    );
  }

  if (!item) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Link
            href="/inventory"
            className="text-sm text-cyan-400"
          >
            ← Back to Inventory
          </Link>

          <p className="text-sm text-slate-400">
            Inventory item not found.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* HEADER */}

        <div>
          <Link
            href="/inventory"
            className="text-sm text-cyan-400 hover:text-cyan-300"
          >
            ← Back to Inventory
          </Link>

          <h1 className="mt-3 text-2xl font-semibold text-white">
            {item.itemName}
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            {item.category}
            {item.sku
              ? ` • ${item.sku}`
              : ""}
            {item.companyName
              ? ` • ${item.companyName}`
              : ""}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {item.trackingType ===
            "Serialized"
              ? "Serialized Inventory"
              : "Quantity Inventory"}
            {item.projectName
              ? ` • ${item.projectName}`
              : ""}
          </p>

          {item.description ? (
            <p className="mt-2 text-sm text-slate-400">
              {item.description}
            </p>
          ) : null}
        </div>

        {/* SUMMARY */}

        {item.trackingType ===
        "Serialized" ? (
          <section className="grid gap-4 md:grid-cols-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs text-slate-400">
                Available
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {counts.available}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs text-slate-400">
                Assigned
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {counts.assigned}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs text-slate-400">
                Installed
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {counts.installed}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs text-slate-400">
                Damaged
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {counts.damaged}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs text-slate-400">
                Lost
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {counts.lost}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs text-slate-400">
                Total
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {counts.total}
              </p>
            </div>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs text-slate-400">
                Warehouse
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {
                  quantityCounts.warehouse
                }
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs text-slate-400">
                Assigned
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {
                  quantityCounts.assigned
                }
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs text-slate-400">
                Total On Hand
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {quantityCounts.total}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs text-slate-400">
                Inventory Value
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {formatCurrencyFromCents(
                  quantityCounts.totalValueCents
                )}
              </p>
            </div>
          </section>
        )}

        {/* SERIALIZED INVENTORY */}

        {item.trackingType ===
        "Serialized" ? (
          <>
            {/* RECEIVE SERIALIZED */}

            <form
              onSubmit={
                handleReceiveUnits
              }
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-5"
            >
              <h2 className="text-lg font-semibold text-white">
                Receive Serialized
                Units
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Paste one serial number
                per line. Each serial
                number creates one
                inventory unit.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Program
                  </span>

                  <input
                    value={
                      item.projectName ||
                      "No program assigned"
                    }
                    readOnly
                    className="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-950 p-2 text-slate-400"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Unit Value
                  </span>

                  <input
                    value={formatCurrencyFromCents(
                      item.standardUnitValueCents
                    )}
                    readOnly
                    className="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-950 p-2 text-slate-400"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Location *
                  </span>

                  <input
                    value={
                      locationName
                    }
                    onChange={(
                      event
                    ) =>
                      setLocationName(
                        event
                          .target
                          .value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    placeholder="Main Warehouse"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Notes
                  </span>

                  <input
                    value={notes}
                    onChange={(
                      event
                    ) =>
                      setNotes(
                        event
                          .target
                          .value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    placeholder="Optional receiving notes"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-slate-300">
                    Serial Numbers *
                  </span>

                  <textarea
                    value={
                      serialNumbers
                    }
                    onChange={(
                      event
                    ) =>
                      setSerialNumbers(
                        event
                          .target
                          .value
                      )
                    }
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
                  disabled={
                    isSaving
                  }
                  className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving
                    ? "Receiving..."
                    : "Receive Units"}
                </button>
              </div>
            </form>

            {/* ASSIGN SERIALIZED */}

            <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold text-white">
                Assign Units to
                Technician
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Search available
                serialized inventory,
                select multiple units,
                and assign them to one
                technician.
              </p>

              <label className="mt-4 block">
                <span className="text-sm font-medium text-slate-300">
                  Search Available
                  Inventory
                </span>

                <input
                  value={
                    assignSearch
                  }
                  onChange={(
                    event
                  ) =>
                    setAssignSearch(
                      event.target
                        .value
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  placeholder="Search by serial number, item, or location..."
                />
              </label>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Technician
                  </span>

                  <select
                    value={
                      selectedTechnicianId
                    }
                    onChange={(
                      event
                    ) =>
                      setSelectedTechnicianId(
                        event
                          .target
                          .value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  >
                    <option value="">
                      Select
                      technician
                    </option>

                    {technicians.map(
                      (
                        technician
                      ) => (
                        <option
                          key={
                            technician.id
                          }
                          value={
                            technician.id
                          }
                        >
                          {getTechnicianName(
                            technician
                          )}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <div className="flex items-end gap-3">
                  <button
                    type="button"
                    onClick={
                      toggleSelectAllAvailable
                    }
                    disabled={
                      filteredAssignableUnits.length ===
                      0
                    }
                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Select All
                    Results
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleAssignSelectedUnits
                    }
                    disabled={
                      isAssigning ||
                      selectedUnitIds.length ===
                        0
                    }
                    className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAssigning
                      ? "Assigning..."
                      : `Assign Selected (${selectedUnitIds.length})`}
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-slate-800">
                {assignableUnits.length ===
                0 ? (
                  <p className="p-4 text-sm text-slate-400">
                    No available
                    units to assign.
                  </p>
                ) : !assignSearch.trim() ? (
                  <p className="p-4 text-sm text-slate-400">
                    Search by serial
                    number, item, or
                    location to find
                    inventory to
                    assign.
                  </p>
                ) : filteredAssignableUnits.length ===
                  0 ? (
                  <p className="p-4 text-sm text-slate-400">
                    No available
                    units match your
                    search.
                  </p>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    {filteredAssignableUnits.map(
                      (unit) => (
                        <label
                          key={
                            unit.id
                          }
                          className="flex cursor-pointer items-center justify-between border-b border-slate-800 px-4 py-3 text-sm hover:bg-slate-800/60"
                        >
                          <div>
                            <p className="font-medium text-white">
                              {
                                unit.serialNumber
                              }
                            </p>

                            <p className="text-xs text-slate-500">
                              {unit.locationName ||
                                "No location"}
                            </p>
                          </div>

                          <input
                            type="checkbox"
                            checked={selectedUnitIds.includes(
                              unit.id
                            )}
                            onChange={() =>
                              toggleSelectedUnit(
                                unit.id
                              )
                            }
                            className="h-4 w-4"
                          />
                        </label>
                      )
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* SERIALIZED UNIT LIST */}

            <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold text-white">
                Serialized Units
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Search, filter, and
                update individual
                serialized units.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Search Serial
                    Number
                  </span>

                  <input
                    value={
                      serialSearch
                    }
                    onChange={(
                      event
                    ) =>
                      setSerialSearch(
                        event
                          .target
                          .value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    placeholder="Search serial..."
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Status
                  </span>

                  <select
                    value={
                      statusFilter
                    }
                    onChange={(
                      event
                    ) =>
                      setStatusFilter(
                        event
                          .target
                          .value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  >
                    <option value="all">
                      All Statuses
                    </option>
                    <option value="available">
                      Available
                    </option>
                    <option value="assigned">
                      Assigned
                    </option>
                    <option value="installed">
                      Installed
                    </option>
                    <option value="damaged">
                      Damaged
                    </option>
                    <option value="lost">
                      Lost
                    </option>
                    <option value="returned">
                      Returned /
                      RTU
                    </option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Technician
                  </span>

                  <select
                    value={
                      technicianFilter
                    }
                    onChange={(
                      event
                    ) =>
                      setTechnicianFilter(
                        event
                          .target
                          .value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  >
                    <option value="all">
                      All
                      Technicians
                    </option>

                    <option value="unassigned">
                      Unassigned
                    </option>

                    {technicianFilterOptions.map(
                      (
                        technician
                      ) => (
                        <option
                          key={
                            technician.id
                          }
                          value={
                            technician.id
                          }
                        >
                          {
                            technician.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Status Action
                    Notes
                  </span>

                  <input
                    value={
                      statusActionNotes
                    }
                    onChange={(
                      event
                    ) =>
                      setStatusActionNotes(
                        event
                          .target
                          .value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    placeholder="Optional action note"
                  />
                </label>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4 text-sm text-slate-400">
                <p>
                  Showing{" "}
                  {filteredUnits.length ===
                  0
                    ? 0
                    : (serializedUnitsPage -
                        1) *
                        SERIALIZED_UNITS_PAGE_SIZE +
                      1}
                  {" - "}
                  {Math.min(
                    serializedUnitsPage *
                      SERIALIZED_UNITS_PAGE_SIZE,
                    filteredUnits.length
                  )}{" "}
                  of{" "}
                  {
                    filteredUnits.length
                  }{" "}
                  matching units
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSerialSearch(
                      ""
                    );
                    setStatusFilter(
                      "all"
                    );
                    setTechnicianFilter(
                      "all"
                    );
                  }}
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  Clear Filters
                </button>
              </div>

              {units.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">
                  No serialized
                  units have been
                  received for this
                  item yet.
                </p>
              ) : filteredUnits.length ===
                0 ? (
                <p className="mt-4 text-sm text-slate-400">
                  No units match
                  the selected
                  filters.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-800 text-slate-400">
                      <tr>
                        <th className="py-2 pr-4">
                          Serial
                          Number
                        </th>
                        <th className="py-2 pr-4">
                          Status
                        </th>
                        <th className="py-2 pr-4">
                          Location
                        </th>
                        <th className="py-2 pr-4">
                          Technician
                        </th>
                        <th className="py-2 pr-4">
                          Work Order
                        </th>
                        <th className="py-2 pr-4">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedUnits.map(
                        (unit) => (
                          <tr
                            key={
                              unit.id
                            }
                            className="border-b border-slate-800 text-slate-200"
                          >
                            <td className="py-3 pr-4 font-medium">
                              <Link
                                href={`/inventory/units/${unit.id}`}
                                className="text-cyan-400 hover:text-cyan-300"
                              >
                                {
                                  unit.serialNumber
                                }
                              </Link>
                            </td>

                            <td className="py-3 pr-4">
                              <span
                                className={`rounded-full border px-2 py-1 text-xs font-medium ${getStatusClass(
                                  unit.status
                                )}`}
                              >
                                {
                                  unit.status
                                }
                              </span>
                            </td>

                            <td className="py-3 pr-4">
                              {unit.locationName ||
                                "—"}
                            </td>

                            <td className="py-3 pr-4">
                              {unit.assignedTechnicianName ||
                                "—"}
                            </td>

                            <td className="py-3 pr-4">
                              {unit.workOrderNumber ||
                                "—"}
                            </td>

                            <td className="py-3 pr-4">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateUnitStatus(
                                      unit,
                                      "installed"
                                    )
                                  }
                                  disabled={
                                    isUpdatingStatus ||
                                    unit.status ===
                                      "installed" ||
                                    unit.status ===
                                      "available" ||
                                    unit.status ===
                                      "returned"
                                  }
                                  className="rounded-md border border-cyan-500/40 px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {isUpdatingStatus &&
                                  statusActionUnitId ===
                                    unit.id
                                    ? "Updating..."
                                    : "Installed"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateUnitStatus(
                                      unit,
                                      "damaged"
                                    )
                                  }
                                  disabled={
                                    isUpdatingStatus ||
                                    unit.status ===
                                      "installed" ||
                                    unit.status ===
                                      "damaged"
                                  }
                                  className="rounded-md border border-amber-500/40 px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {isUpdatingStatus &&
                                  statusActionUnitId ===
                                    unit.id
                                    ? "Updating..."
                                    : "Damaged"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateUnitStatus(
                                      unit,
                                      "lost"
                                    )
                                  }
                                  disabled={
                                    isUpdatingStatus ||
                                    unit.status ===
                                      "installed" ||
                                    unit.status ===
                                      "lost"
                                  }
                                  className="rounded-md border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  Lost
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateUnitStatus(
                                      unit,
                                      "returned"
                                    )
                                  }
                                  disabled={
                                    isUpdatingStatus ||
                                    unit.status ===
                                      "installed" ||
                                    unit.status ===
                                      "returned"
                                  }
                                  className="rounded-md border border-slate-500/40 px-2 py-1 text-xs text-slate-300 hover:bg-slate-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  RTU
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {filteredUnits.length >
              SERIALIZED_UNITS_PAGE_SIZE ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                  <p className="text-sm text-slate-400">
                    Page{" "}
                    {
                      serializedUnitsPage
                    }{" "}
                    of{" "}
                    {
                      totalSerializedUnitPages
                    }
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSerializedUnitsPage(
                          (
                            current
                          ) =>
                            Math.max(
                              1,
                              current -
                                1
                            )
                        )
                      }
                      disabled={
                        serializedUnitsPage ===
                        1
                      }
                      className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setSerializedUnitsPage(
                          (
                            current
                          ) =>
                            Math.min(
                              totalSerializedUnitPages,
                              current +
                                1
                            )
                        )
                      }
                      disabled={
                        serializedUnitsPage ===
                        totalSerializedUnitPages
                      }
                      className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          </>
        ) : (
          <>
            {/* RECEIVE QUANTITY */}

            <form
              onSubmit={
                handleReceiveQuantity
              }
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-5"
            >
              <h2 className="text-lg font-semibold text-white">
                Receive Inventory
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Add non-serialized
                inventory to a
                warehouse location.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Quantity *
                  </span>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      quantityReceiveAmount
                    }
                    onChange={(
                      event
                    ) =>
                      setQuantityReceiveAmount(
                        event
                          .target
                          .value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    placeholder="0"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Location *
                  </span>

                  <input
                    value={
                      locationName
                    }
                    onChange={(
                      event
                    ) =>
                      setLocationName(
                        event
                          .target
                          .value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    placeholder="Main Warehouse"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Unit Value
                  </span>

                  <input
                    value={formatCurrencyFromCents(
                      item.standardUnitValueCents
                    )}
                    readOnly
                    className="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-700 bg-slate-950 p-2 text-slate-400"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Notes
                  </span>

                  <input
                    value={
                      quantityReceiveNotes
                    }
                    onChange={(
                      event
                    ) =>
                      setQuantityReceiveNotes(
                        event
                          .target
                          .value
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    placeholder="Optional receiving notes"
                  />
                </label>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="submit"
                  disabled={
                    isQuantityReceiving
                  }
                  className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isQuantityReceiving
                    ? "Receiving..."
                    : "Receive Inventory"}
                </button>
              </div>
            </form>

            {/* ASSIGN QUANTITY */}

            <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold text-white">
                Assign Inventory
                to Technician
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Transfer
                non-serialized
                inventory from a
                warehouse location to
                a technician.
              </p>

              {warehouseBalances.length ===
              0 ? (
                <p className="mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">
                  No warehouse
                  inventory is
                  currently available
                  to assign.
                </p>
              ) : (
                <>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-300">
                        From
                        Location
                      </span>

                      <select
                        value={
                          quantityAssignLocation
                        }
                        onChange={(
                          event
                        ) =>
                          setQuantityAssignLocation(
                            event
                              .target
                              .value
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                      >
                        {warehouseBalances.map(
                          (
                            balance
                          ) => (
                            <option
                              key={
                                balance.id
                              }
                              value={
                                balance.locationName
                              }
                            >
                              {
                                balance.locationName
                              }{" "}
                              —{" "}
                              {
                                balance.quantity
                              }{" "}
                              available
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-300">
                        Technician
                      </span>

                      <select
                        value={
                          selectedTechnicianId
                        }
                        onChange={(
                          event
                        ) =>
                          setSelectedTechnicianId(
                            event
                              .target
                              .value
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                      >
                        <option value="">
                          Select
                          technician
                        </option>

                        {technicians.map(
                          (
                            technician
                          ) => (
                            <option
                              key={
                                technician.id
                              }
                              value={
                                technician.id
                              }
                            >
                              {getTechnicianName(
                                technician
                              )}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-300">
                        Quantity
                      </span>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={
                          quantityAssignAmount
                        }
                        onChange={(
                          event
                        ) =>
                          setQuantityAssignAmount(
                            event
                              .target
                              .value
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                        placeholder="0"
                      />
                    </label>

                    <label className="block md:col-span-3">
                      <span className="text-sm font-medium text-slate-300">
                        Notes
                      </span>

                      <input
                        value={
                          quantityAssignNotes
                        }
                        onChange={(
                          event
                        ) =>
                          setQuantityAssignNotes(
                            event
                              .target
                              .value
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                        placeholder="Optional assignment notes"
                      />
                    </label>
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={
                        handleAssignQuantity
                      }
                      disabled={
                        isQuantityAssigning ||
                        !selectedTechnicianId ||
                        !quantityAssignAmount
                      }
                      className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isQuantityAssigning
                        ? "Assigning..."
                        : "Assign Inventory"}
                    </button>
                  </div>
                </>
              )}
            </section>

            {/* QUANTITY BALANCES */}

            <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold text-white">
                Inventory Balances
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Current quantity by
                warehouse and
                technician.
              </p>

              {balances.length ===
              0 ? (
                <p className="mt-4 text-sm text-slate-400">
                  No inventory has
                  been received for
                  this item yet.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-800 text-slate-400">
                      <tr>
                        <th className="py-2 pr-4">
                          Location
                        </th>
                        <th className="py-2 pr-4">
                          Type
                        </th>
                        <th className="py-2 pr-4">
                          Quantity
                        </th>
                        <th className="py-2 pr-4">
                          Unit Value
                        </th>
                        <th className="py-2 pr-4">
                          Total Value
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {balances
                        .slice()
                        .sort(
                          (a, b) => {
                            if (
                              a.locationType !==
                              b.locationType
                            ) {
                              return a.locationType.localeCompare(
                                b.locationType
                              );
                            }

                            return a.locationName.localeCompare(
                              b.locationName
                            );
                          }
                        )
                        .map(
                          (
                            balance
                          ) => (
                            <tr
                              key={
                                balance.id
                              }
                              className="border-b border-slate-800 text-slate-200"
                            >
                              <td className="py-3 pr-4 font-medium text-white">
                                {balance.locationName ||
                                  "Unknown"}
                              </td>

                              <td className="py-3 pr-4 capitalize">
                                {
                                  balance.locationType
                                }
                              </td>

                              <td className="py-3 pr-4">
                                {
                                  balance.quantity
                                }
                              </td>

                              <td className="py-3 pr-4">
                                {formatCurrencyFromCents(
                                  item.standardUnitValueCents
                                )}
                              </td>

                              <td className="py-3 pr-4">
                                {formatCurrencyFromCents(
                                  balance.quantity *
                                    item.standardUnitValueCents
                                )}
                              </td>
                            </tr>
                          )
                        )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}