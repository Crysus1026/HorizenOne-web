import type { Technician } from "@/features/technicians/types/technician";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
  increment,
  writeBatch,
} from "firebase/firestore";

import type {
  InventoryBalance,
} from "../types/inventoryBalance";

import type {
  InventoryItem,
  InventoryTrackingType,
} from "../types/inventoryItem";
import type {
  InventoryUnit,
  InventoryUnitStatus,
} from "../types/inventoryUnit";

export type InventoryItemDetailData = {
  item: InventoryItem | null;
  units: InventoryUnit[];
  balances: InventoryBalance[];
  technicians: Technician[];
};

export type ReceiveSerializedUnitsInput = {
  item: InventoryItem;
  inventoryItemId: string;
  serialNumbers: string[];
  locationName: string;
  notes?: string;
};

export type AssignSerializedUnitsInput = {
  item: InventoryItem;
  inventoryItemId: string;
  units: InventoryUnit[];
  technician: Technician;
  technicianName: string;
};

export type UpdateSerializedUnitStatusInput = {
  item: InventoryItem;
  inventoryItemId: string;
  unit: InventoryUnit;
  newStatus:
    | "installed"
    | "damaged"
    | "lost"
    | "returned";
  notes?: string;
};

export type ReceiveQuantityInventoryInput = {
  item: InventoryItem;
  inventoryItemId: string;
  quantity: number;
  locationName: string;
  notes?: string;
};

export type AssignQuantityInventoryInput = {
  item: InventoryItem;
  inventoryItemId: string;
  technician: Technician;
  technicianName: string;
  quantity: number;
  fromLocationName: string;
  notes?: string;
};

export type ReturnQuantityInventoryInput = {
  item: InventoryItem;
  inventoryItemId: string;
  technician: Technician;
  technicianName: string;
  quantity: number;
  toLocationName: string;
  notes?: string;
};

export type AdjustQuantityInventoryInput = {
  item: InventoryItem;
  inventoryItemId: string;
  balance: InventoryBalance;
  newQuantity: number;
  notes: string;
};

function normalizeTrackingType(
  trackingType: unknown,
  requiresSerial: unknown
): InventoryTrackingType {
  if (trackingType === "Quantity") {
    return "Quantity";
  }

  if (trackingType === "Serialized") {
    return "Serialized";
  }

  return requiresSerial === false ? "Quantity" : "Serialized";
}

function normalizeInventoryUnitStatus(
  status: unknown
): InventoryUnitStatus {
  switch (status) {
    case "available":
    case "assigned":
    case "installed":
    case "damaged":
    case "lost":
    case "returned":
      return status;

    default:
      return "available";
  }
}

function technicianBelongsToProject(
  technician: Technician,
  projectId: string
): boolean {
  if (!projectId) {
    return true;
  }

  /*
   * Preserve compatibility with technician records created before
   * program assignments were added. An empty or missing projectIds
   * array currently means the technician is not program-restricted.
   */
  if (
    !Array.isArray(technician.projectIds) ||
    technician.projectIds.length === 0
  ) {
    return true;
  }

  return technician.projectIds.includes(projectId);
}

function normalizeBalanceKey(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getWarehouseBalanceId(
  inventoryItemId: string,
  locationName: string
): string {
  return `${inventoryItemId}_warehouse_${normalizeBalanceKey(
    locationName
  )}`;
}

function getTechnicianBalanceId(
  inventoryItemId: string,
  technicianId: string
): string {
  return `${inventoryItemId}_technician_${technicianId}`;
}

export async function getInventoryItemDetail(
  inventoryItemId: string
): Promise<InventoryItemDetailData> {
  if (!inventoryItemId) {
    return {
      item: null,
      units: [],
      balances: [],
      technicians: [],
    };
  }

  const itemReference = doc(
    db,
    "inventoryItems",
    inventoryItemId
  );

  const itemSnapshot = await getDoc(itemReference);

  if (!itemSnapshot.exists()) {
    return {
      item: null,
      units: [],
      balances: [],
      technicians: [],
    };
  }

  const itemData = itemSnapshot.data();

  const trackingType = normalizeTrackingType(
    itemData.trackingType,
    itemData.requiresSerial
  );

  const item: InventoryItem = {
    id: itemSnapshot.id,

    companyId: itemData.companyId ?? "",
    companyName: itemData.companyName ?? "",

    projectId: itemData.projectId ?? "",
    projectName: itemData.projectName ?? "",

    itemName: itemData.itemName ?? "",
    category: itemData.category ?? "",
    sku: itemData.sku ?? "",
    description: itemData.description ?? "",

    trackingType,

    /*
     * Retained temporarily for compatibility with older inventory
     * pages that still use requiresSerial.
     */
    requiresSerial:
      typeof itemData.requiresSerial === "boolean"
        ? itemData.requiresSerial
        : trackingType === "Serialized",

    unitOfMeasure: itemData.unitOfMeasure || "Each",

    standardUnitValueCents:
      Number(itemData.standardUnitValueCents) || 0,

    minimumStock:
      Number(itemData.minimumStock) || 0,

    isActive: itemData.isActive !== false,
  };

  if (!item.companyId) {
    throw new Error(
      "The inventory item is not assigned to a company."
    );
  }

  const techniciansQuery = query(
    collection(db, "users"),
    where("companyId", "==", item.companyId),
    where("technicianEnabled", "==", true),
    where("isActive", "==", true)
  );

  const unitsQuery = query(
    collection(db, "inventoryUnits"),
    where("companyId", "==", item.companyId),
    where("projectId", "==", item.projectId),
    where("inventoryItemId", "==", inventoryItemId)
  );

  const balancesQuery = query(
    collection(db, "inventoryBalances"),
    where("companyId", "==", item.companyId),
    where("projectId", "==", item.projectId),
    where(
      "inventoryItemId",
      "==",
      inventoryItemId
    )
  );

  const [
    techniciansSnapshot,
    unitsSnapshot,
    balancesSnapshot,
  ] = await Promise.all([
    getDocs(techniciansQuery),
    getDocs(unitsQuery),
    getDocs(balancesQuery),
  ]);

  const technicians = techniciansSnapshot.docs
    .map((technicianDocument): Technician => {
      const data = technicianDocument.data();

      return {
        id: technicianDocument.id,

        companyId: data.companyId ?? "",

        projectIds: Array.isArray(data.projectIds)
          ? data.projectIds
          : [],

        firstName: data.firstName ?? "",
        lastName: data.lastName ?? "",
        email: data.email ?? "",

        role: data.role ?? "",
        isActive: data.isActive !== false,
      };
    })
    .filter((technician) =>
      technicianBelongsToProject(
        technician,
        item.projectId
      )
    )
    .sort((technicianA, technicianB) => {
      const technicianAName =
        `${technicianA.firstName ?? ""} ${
          technicianA.lastName ?? ""
        }`.trim();

      const technicianBName =
        `${technicianB.firstName ?? ""} ${
          technicianB.lastName ?? ""
        }`.trim();

      return technicianAName.localeCompare(
        technicianBName
      );
    });

  const units = unitsSnapshot.docs
    .map((unitDocument): InventoryUnit => {
      const data = unitDocument.data();

      return {
        id: unitDocument.id,

        companyId:
          data.companyId ?? item.companyId,

        companyName:
          data.companyName ?? item.companyName,

        projectId:
          data.projectId ?? item.projectId,

        projectName:
          data.projectName ?? item.projectName,

        inventoryItemId:
          data.inventoryItemId ?? inventoryItemId,

        itemName:
          data.itemName ?? item.itemName,

        serialNumber:
          data.serialNumber ?? "",

        status:
          normalizeInventoryUnitStatus(
            data.status
          ),

        locationId:
          data.locationId ?? "",

        locationName:
          data.locationName ?? "",

        assignedTechnicianId:
          data.assignedTechnicianId ?? "",

        assignedTechnicianName:
          data.assignedTechnicianName ?? "",

        workOrderId:
          data.workOrderId ?? "",

        workOrderNumber:
          data.workOrderNumber ?? "",
      };
    })
    .sort((unitA, unitB) =>
      unitA.serialNumber.localeCompare(
        unitB.serialNumber
      )
    );

    const balances =
  balancesSnapshot.docs
    .map(
      (
        balanceDocument
      ): InventoryBalance => {
        const data =
          balanceDocument.data();

        return {
          id: balanceDocument.id,

          companyId:
            data.companyId ??
            item.companyId,

          projectId:
            data.projectId ??
            item.projectId,

          inventoryItemId:
            data.inventoryItemId ??
            inventoryItemId,

          locationType:
            data.locationType ===
            "technician"
              ? "technician"
              : "warehouse",

          locationId:
            data.locationId ?? "",

          locationName:
            data.locationName ?? "",

          technicianId:
            data.technicianId ?? "",

          technicianName:
            data.technicianName ?? "",

          quantity:
            Number(data.quantity) || 0,
        };
      }
    )
    .sort((balanceA, balanceB) =>
      balanceA.locationName.localeCompare(
        balanceB.locationName
      )
    );

  return {
    item,
    units,
    balances,
    technicians,
  };
}

export async function receiveSerializedUnits({
  item,
  inventoryItemId,
  serialNumbers,
  locationName,
  notes,
}: ReceiveSerializedUnitsInput): Promise<void> {
  if (!inventoryItemId) {
    throw new Error(
      "Inventory item ID is required."
    );
  }

  if (!item.companyId) {
    throw new Error(
      "Inventory item company is required."
    );
  }

  if (!item.projectId) {
    throw new Error(
      "Inventory item program is required."
    );
  }

  if (item.trackingType !== "Serialized") {
    throw new Error(
      "Serialized receiving is only available for serialized inventory items."
    );
  }

  const normalizedLocationName =
    locationName.trim();

  if (!normalizedLocationName) {
    throw new Error("Location is required.");
  }

  const normalizedSerialNumbers =
    Array.from(
      new Set(
        serialNumbers
          .map((serialNumber) =>
            serialNumber.trim()
          )
          .filter(Boolean)
      )
    );

  if (
    normalizedSerialNumbers.length === 0
  ) {
    throw new Error(
      "At least one serial number is required."
    );
  }

  for (
    const serialNumber of
    normalizedSerialNumbers
  ) {
    const unitReference = await addDoc(
      collection(db, "inventoryUnits"),
      {
        companyId: item.companyId,
        companyName: item.companyName ?? "",

        projectId: item.projectId,
        projectName: item.projectName ?? "",

        inventoryItemId,
        itemName: item.itemName,

        serialNumber,

        status: "available",

        /*
         * Temporary free-text location field.
         * This will later be replaced by locationId
         * when structured inventory locations are added.
         */
        locationName: normalizedLocationName,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );

    await addDoc(
      collection(db, "inventoryTransactions"),
      {
        companyId: item.companyId,
        companyName:
          item.companyName ?? "",

        projectId: item.projectId,
        projectName:
          item.projectName ?? "",

        inventoryItemId,
        inventoryUnitId:
          unitReference.id,

        itemName: item.itemName,
        serialNumber,

        type: "received",

        toLocationName:
          normalizedLocationName,

        /*
         * Capture the current item value so historical
         * transaction value does not change if the item's
         * standard value is edited later.
         */
        unitValueCents:
          item.standardUnitValueCents ?? 0,

        totalValueCents:
          item.standardUnitValueCents ?? 0,

        notes: notes?.trim() ?? "",

        createdAt: serverTimestamp(),
      }
    );
  }
}

export async function assignSerializedUnits({
  item,
  inventoryItemId,
  units,
  technician,
  technicianName,
}: AssignSerializedUnitsInput): Promise<number> {
  const eligibleUnits = units.filter(
    (unit) =>
      unit.status === "available" ||
      unit.status === "returned"
  );

  if (eligibleUnits.length === 0) {
    throw new Error(
      "No eligible inventory units were selected."
    );
  }

  const batch = writeBatch(db);

  for (const unit of eligibleUnits) {
    const unitReference = doc(
      db,
      "inventoryUnits",
      unit.id
    );

    batch.update(unitReference, {
      status: "assigned",
      assignedTechnicianId: technician.id,
      assignedTechnicianName:
        technicianName,
      locationName: "",
      updatedAt: serverTimestamp(),
    });

    const transactionReference = doc(
      collection(
        db,
        "inventoryTransactions"
      )
    );

    batch.set(transactionReference, {
      companyId: item.companyId,
      companyName:
        item.companyName ?? "",

      projectId: item.projectId,
      projectName:
        item.projectName ?? "",

      inventoryItemId,
      inventoryUnitId: unit.id,

      itemName: item.itemName,
      serialNumber: unit.serialNumber,

      type: "assigned_to_tech",
      quantity: 1,

      fromLocationName:
        unit.locationName ?? "",

      toTechnicianId:
        technician.id,

      toTechnicianName:
        technicianName,

      unitValueCents:
        item.standardUnitValueCents ?? 0,

      totalValueCents:
        item.standardUnitValueCents ?? 0,

      notes:
        "Bulk assigned to technician",

      createdAt:
        serverTimestamp(),
    });
  }

  await batch.commit();

  return eligibleUnits.length;
}

export async function updateSerializedUnitStatus({
  item,
  inventoryItemId,
  unit,
  newStatus,
  notes,
}: UpdateSerializedUnitStatusInput): Promise<void> {
  const updateData =
    newStatus === "returned"
      ? {
          status: "returned",
          locationName: "Main Warehouse",
          assignedTechnicianId: "",
          assignedTechnicianName: "",
          updatedAt: serverTimestamp(),
        }
      : newStatus === "installed"
        ? {
            status: "installed",
            locationName: "",
            assignedTechnicianId: "",
            assignedTechnicianName: "",
            updatedAt: serverTimestamp(),
          }
        : {
            status: newStatus,
            updatedAt: serverTimestamp(),
          };

  await updateDoc(
    doc(db, "inventoryUnits", unit.id),
    updateData
  );

  await addDoc(
    collection(db, "inventoryTransactions"),
    {
      companyId: item.companyId,
      companyName: item.companyName ?? "",

      projectId: item.projectId,
      projectName: item.projectName ?? "",

      inventoryItemId,
      inventoryUnitId: unit.id,

      itemName: item.itemName,
      serialNumber: unit.serialNumber,

      type: newStatus,
      quantity: 1,

      fromLocationName:
        unit.locationName ?? "",

      fromTechnicianId:
        unit.assignedTechnicianId ?? "",

      fromTechnicianName:
        unit.assignedTechnicianName ?? "",

      toLocationName:
        newStatus === "returned"
          ? "Main Warehouse"
          : "",

      unitValueCents:
        item.standardUnitValueCents ?? 0,

      totalValueCents:
        item.standardUnitValueCents ?? 0,

      notes:
        notes?.trim() ||
        (newStatus === "returned"
          ? "Marked RTU / returned from item detail page"
          : newStatus === "installed"
            ? "Marked installed and removed from technician inventory"
            : `Marked ${newStatus} from item detail page`),

      createdAt: serverTimestamp(),
    }
  );
}

export async function receiveQuantityInventory({
  item,
  inventoryItemId,
  quantity,
  locationName,
  notes,
}: ReceiveQuantityInventoryInput): Promise<void> {
  if (!inventoryItemId) {
    throw new Error(
      "Inventory item ID is required."
    );
  }

  if (!item.companyId) {
    throw new Error(
      "Inventory item company is required."
    );
  }

  if (!item.projectId) {
    throw new Error(
      "Inventory item program is required."
    );
  }

  if (item.trackingType !== "Quantity") {
    throw new Error(
      "Quantity receiving is only available for quantity inventory items."
    );
  }

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    throw new Error(
      "Quantity must be greater than zero."
    );
  }

  const normalizedQuantity =
    Math.floor(quantity);

  const normalizedLocationName =
    locationName.trim();

  if (!normalizedLocationName) {
    throw new Error(
      "Location is required."
    );
  }

  const balanceReference = doc(
    db,
    "inventoryBalances",
    getWarehouseBalanceId(
      inventoryItemId,
      normalizedLocationName
    )
  );

  const transactionReference = doc(
    collection(
      db,
      "inventoryTransactions"
    )
  );

  const batch = writeBatch(db);

  batch.set(
    balanceReference,
    {
      companyId: item.companyId,
      companyName:
        item.companyName ?? "",

      projectId: item.projectId,
      projectName:
        item.projectName ?? "",

      inventoryItemId,

      locationType: "warehouse",
      locationId: "",

      locationName:
        normalizedLocationName,

      technicianId: "",
      technicianName: "",

      quantity:
        increment(
          normalizedQuantity
        ),

      updatedAt:
        serverTimestamp(),
    },
    {
      merge: true,
    }
  );

  batch.set(
    transactionReference,
    {
      companyId:
        item.companyId,

      companyName:
        item.companyName ?? "",

      projectId:
        item.projectId,

      projectName:
        item.projectName ?? "",

      inventoryItemId,

      itemName:
        item.itemName,

      type: "received",

      quantity:
        normalizedQuantity,

      fromLocationName: "",

      toLocationName:
        normalizedLocationName,

      unitValueCents:
        item.standardUnitValueCents ??
        0,

      totalValueCents:
        normalizedQuantity *
        (item.standardUnitValueCents ??
          0),

      notes:
        notes?.trim() ?? "",

      createdAt:
        serverTimestamp(),
    }
  );

  await batch.commit();
}

export async function assignQuantityInventory({
  item,
  inventoryItemId,
  technician,
  technicianName,
  quantity,
  fromLocationName,
  notes,
}: AssignQuantityInventoryInput): Promise<void> {
  if (item.trackingType !== "Quantity") {
    throw new Error(
      "Quantity assignment is only available for quantity inventory items."
    );
  }

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    throw new Error(
      "Quantity must be greater than zero."
    );
  }

  const normalizedQuantity =
    Math.floor(quantity);

  const normalizedLocationName =
    fromLocationName.trim();

  if (!normalizedLocationName) {
    throw new Error(
      "Source location is required."
    );
  }

  const warehouseReference = doc(
    db,
    "inventoryBalances",
    getWarehouseBalanceId(
      inventoryItemId,
      normalizedLocationName
    )
  );

  const technicianReference = doc(
    db,
    "inventoryBalances",
    getTechnicianBalanceId(
      inventoryItemId,
      technician.id
    )
  );

  const inventoryTransactionReference =
    doc(
      collection(
        db,
        "inventoryTransactions"
      )
    );

  await runTransaction(
    db,
    async (transaction) => {
      const warehouseSnapshot =
        await transaction.get(
          warehouseReference
        );

      if (!warehouseSnapshot.exists()) {
        throw new Error(
          "Source inventory balance was not found."
        );
      }

      const warehouseQuantity =
        Number(
          warehouseSnapshot.data()
            .quantity
        ) || 0;

      if (
        warehouseQuantity <
        normalizedQuantity
      ) {
        throw new Error(
          `Insufficient inventory. ${warehouseQuantity} available.`
        );
      }

      transaction.update(
        warehouseReference,
        {
          quantity:
            warehouseQuantity -
            normalizedQuantity,

          updatedAt:
            serverTimestamp(),
        }
      );

      transaction.set(
        technicianReference,
        {
          companyId:
            item.companyId,

          companyName:
            item.companyName ?? "",

          projectId:
            item.projectId,

          projectName:
            item.projectName ?? "",

          inventoryItemId,

          locationType:
            "technician",

          locationId:
            technician.id,

          locationName:
            technicianName,

          technicianId:
            technician.id,

          technicianName,

          quantity:
            increment(
              normalizedQuantity
            ),

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      transaction.set(
        inventoryTransactionReference,
        {
          companyId:
            item.companyId,

          companyName:
            item.companyName ?? "",

          projectId:
            item.projectId,

          projectName:
            item.projectName ?? "",

          inventoryItemId,

          itemName:
            item.itemName,

          type:
            "assigned_to_tech",

          quantity:
            normalizedQuantity,

          fromLocationName:
            normalizedLocationName,

          toTechnicianId:
            technician.id,

          toTechnicianName:
            technicianName,

          unitValueCents:
            item.standardUnitValueCents ??
            0,

          totalValueCents:
            normalizedQuantity *
            (item.standardUnitValueCents ??
              0),

          notes:
            notes?.trim() ||
            "Quantity inventory assigned to technician",

          createdAt:
            serverTimestamp(),
        }
      );
    }
  );
}

export async function returnQuantityInventory({
  item,
  inventoryItemId,
  technician,
  technicianName,
  quantity,
  toLocationName,
  notes,
}: ReturnQuantityInventoryInput): Promise<void> {
  if (item.trackingType !== "Quantity") {
    throw new Error(
      "Quantity returns are only available for quantity inventory items."
    );
  }

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    throw new Error(
      "Quantity must be greater than zero."
    );
  }

  const normalizedQuantity =
    Math.floor(quantity);

  const normalizedLocationName =
    toLocationName.trim();

  if (!normalizedLocationName) {
    throw new Error(
      "Destination location is required."
    );
  }

  const technicianReference = doc(
    db,
    "inventoryBalances",
    getTechnicianBalanceId(
      inventoryItemId,
      technician.id
    )
  );

  const warehouseReference = doc(
    db,
    "inventoryBalances",
    getWarehouseBalanceId(
      inventoryItemId,
      normalizedLocationName
    )
  );

  const inventoryTransactionReference =
    doc(
      collection(
        db,
        "inventoryTransactions"
      )
    );

  await runTransaction(
    db,
    async (transaction) => {
      const technicianSnapshot =
        await transaction.get(
          technicianReference
        );

      if (!technicianSnapshot.exists()) {
        throw new Error(
          "Technician inventory balance was not found."
        );
      }

      const technicianQuantity =
        Number(
          technicianSnapshot.data()
            .quantity
        ) || 0;

      if (
        technicianQuantity <
        normalizedQuantity
      ) {
        throw new Error(
          `Technician only has ${technicianQuantity} available.`
        );
      }

      const warehouseSnapshot =
        await transaction.get(
          warehouseReference
        );

      const warehouseQuantity =
        warehouseSnapshot.exists()
          ? Number(
              warehouseSnapshot.data()
                .quantity
            ) || 0
          : 0;

      transaction.update(
        technicianReference,
        {
          quantity:
            technicianQuantity -
            normalizedQuantity,

          updatedAt:
            serverTimestamp(),
        }
      );

      transaction.set(
        warehouseReference,
        {
          companyId:
            item.companyId,

          companyName:
            item.companyName ?? "",

          projectId:
            item.projectId,

          projectName:
            item.projectName ?? "",

          inventoryItemId,

          locationType: "warehouse",

          locationId: "",

          locationName:
            normalizedLocationName,

          technicianId: "",
          technicianName: "",

          quantity:
            warehouseQuantity +
            normalizedQuantity,

          updatedAt:
            serverTimestamp(),

          ...(warehouseSnapshot.exists()
            ? {}
            : {
                createdAt:
                  serverTimestamp(),
              }),
        },
        {
          merge: true,
        }
      );

      transaction.set(
        inventoryTransactionReference,
        {
          companyId:
            item.companyId,

          companyName:
            item.companyName ?? "",

          projectId:
            item.projectId,

          projectName:
            item.projectName ?? "",

          inventoryItemId,

          itemName:
            item.itemName,

          type: "returned",

          quantity:
            normalizedQuantity,

          fromTechnicianId:
            technician.id,

          fromTechnicianName:
            technicianName,

          toLocationName:
            normalizedLocationName,

          unitValueCents:
            item.standardUnitValueCents ??
            0,

          totalValueCents:
            normalizedQuantity *
            (item.standardUnitValueCents ??
              0),

          notes:
            notes?.trim() ||
            "Quantity inventory returned to warehouse",

          createdAt:
            serverTimestamp(),
        }
      );
    }
  );
}

export async function adjustQuantityInventory({
  item,
  inventoryItemId,
  balance,
  newQuantity,
  notes,
}: AdjustQuantityInventoryInput): Promise<void> {
  if (item.trackingType !== "Quantity") {
    throw new Error(
      "Quantity adjustments are only available for quantity inventory items."
    );
  }

  if (
    !Number.isFinite(newQuantity) ||
    newQuantity < 0
  ) {
    throw new Error(
      "Adjusted quantity must be zero or greater."
    );
  }

  const normalizedQuantity =
    Math.floor(newQuantity);

  const normalizedNotes =
    notes.trim();

  if (!normalizedNotes) {
    throw new Error(
      "Adjustment notes are required."
    );
  }

  const balanceReference = doc(
    db,
    "inventoryBalances",
    balance.id
  );

  const transactionReference = doc(
    collection(
      db,
      "inventoryTransactions"
    )
  );

  await runTransaction(
    db,
    async (transaction) => {
      const balanceSnapshot =
        await transaction.get(
          balanceReference
        );

      if (!balanceSnapshot.exists()) {
        throw new Error(
          "Inventory balance was not found."
        );
      }

      const oldQuantity =
        Number(
          balanceSnapshot.data()
            .quantity
        ) || 0;

      const adjustment =
        normalizedQuantity -
        oldQuantity;

      transaction.update(
        balanceReference,
        {
          quantity:
            normalizedQuantity,

          updatedAt:
            serverTimestamp(),
        }
      );

      transaction.set(
        transactionReference,
        {
          companyId:
            item.companyId,

          companyName:
            item.companyName ?? "",

          projectId:
            item.projectId,

          projectName:
            item.projectName ?? "",

          inventoryItemId,

          itemName:
            item.itemName,

          type: "adjustment",

          quantity:
            adjustment,

          previousQuantity:
            oldQuantity,

          newQuantity:
            normalizedQuantity,

          locationName:
            balance.locationName,

          technicianId:
            balance.technicianId ??
            "",

          technicianName:
            balance.technicianName ??
            "",

          unitValueCents:
            item.standardUnitValueCents ??
            0,

          totalValueCents:
            Math.abs(adjustment) *
            (item.standardUnitValueCents ??
              0),

          notes:
            normalizedNotes,

          createdAt:
            serverTimestamp(),
        }
      );
    }
  );
}