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
  serverTimestamp,
  where,
} from "firebase/firestore";

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

export async function getInventoryItemDetail(
  inventoryItemId: string
): Promise<InventoryItemDetailData> {
  if (!inventoryItemId) {
    return {
      item: null,
      units: [],
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

  const [techniciansSnapshot, unitsSnapshot] =
    await Promise.all([
      getDocs(techniciansQuery),
      getDocs(unitsQuery),
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

  return {
    item,
    units,
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
}: AssignSerializedUnitsInput): Promise<void> {
  for (const unit of units) {
    if (
      unit.status !== "available" &&
      unit.status !== "returned"
    ) {
      continue;
    }

    await updateDoc(
      doc(db, "inventoryUnits", unit.id),
      {
        status: "assigned",
        assignedTechnicianId: technician.id,
        assignedTechnicianName: technicianName,
        locationName: "",
        updatedAt: serverTimestamp(),
      }
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

        type: "assigned_to_tech",
        quantity: 1,

        fromLocationName:
          unit.locationName ?? "",

        toTechnicianId: technician.id,
        toTechnicianName: technicianName,

        unitValueCents:
          item.standardUnitValueCents ?? 0,

        totalValueCents:
          item.standardUnitValueCents ?? 0,

        notes: "Bulk assigned to technician",

        createdAt: serverTimestamp(),
      }
    );
  }
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