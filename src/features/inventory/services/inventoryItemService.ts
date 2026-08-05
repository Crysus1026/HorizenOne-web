import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import type {
  CreateInventoryItemInput,
  InventoryItem,
  InventoryTrackingType,
} from "../types/inventoryItem";

export type UpdateInventoryItemInput = {
  itemName: string;
  category: string;
  sku?: string;
  description?: string;
  unitOfMeasure: string;
  standardUnitValueCents: number;
  minimumStock: number;
  isActive: boolean;
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

function normalizeInventoryItem(
  documentId: string,
  data: Record<string, unknown>
): InventoryItem {
  const trackingType = normalizeTrackingType(
    data.trackingType,
    data.requiresSerial
  );

  return {
    id: documentId,

    companyId:
      typeof data.companyId === "string"
        ? data.companyId
        : "",

    companyName:
      typeof data.companyName === "string"
        ? data.companyName
        : "",

    projectId:
      typeof data.projectId === "string"
        ? data.projectId
        : "",

    projectName:
      typeof data.projectName === "string"
        ? data.projectName
        : "",

    itemName:
      typeof data.itemName === "string"
        ? data.itemName
        : "",

    category:
      typeof data.category === "string"
        ? data.category
        : "",

    sku:
      typeof data.sku === "string"
        ? data.sku
        : "",

    description:
      typeof data.description === "string"
        ? data.description
        : "",

    trackingType,

    /*
     * Temporary compatibility field.
     * Remove after all inventory pages use trackingType.
     */
    requiresSerial:
      typeof data.requiresSerial === "boolean"
        ? data.requiresSerial
        : trackingType === "Serialized",

    unitOfMeasure:
      typeof data.unitOfMeasure === "string" &&
      data.unitOfMeasure
        ? data.unitOfMeasure
        : "Each",

    standardUnitValueCents:
      typeof data.standardUnitValueCents === "number"
        ? data.standardUnitValueCents
        : 0,

    minimumStock:
      typeof data.minimumStock === "number"
        ? data.minimumStock
        : 0,

    isActive: data.isActive !== false,
  };
}

export async function getInventoryItemsForProject({
  companyId,
  projectId,
}: {
  companyId: string;
  projectId: string;
}): Promise<InventoryItem[]> {
  if (!companyId || !projectId) {
    return [];
  }

  const itemsQuery = query(
    collection(db, "inventoryItems"),
    where("companyId", "==", companyId),
    where("projectId", "==", projectId),
    orderBy("itemName", "asc")
  );

  const snapshot = await getDocs(itemsQuery);

  return snapshot.docs.map((document) =>
    normalizeInventoryItem(
      document.id,
      document.data()
    )
  );
}

export async function getInventoryItemById(
  inventoryItemId: string
): Promise<InventoryItem | null> {
  if (!inventoryItemId) {
    return null;
  }

  const itemReference = doc(
    db,
    "inventoryItems",
    inventoryItemId
  );

  const itemSnapshot = await getDoc(
    itemReference
  );

  if (!itemSnapshot.exists()) {
    return null;
  }

  return normalizeInventoryItem(
    itemSnapshot.id,
    itemSnapshot.data()
  );
}

export async function createInventoryItem(
  input: CreateInventoryItemInput
): Promise<string> {
  const itemName = input.itemName.trim();
  const category = input.category.trim();

  if (!input.companyId) {
    throw new Error("Company is required.");
  }

  if (!input.projectId) {
    throw new Error("Program is required.");
  }

  if (!itemName) {
    throw new Error("Item name is required.");
  }

  if (!category) {
    throw new Error("Category is required.");
  }

  if (
    !Number.isFinite(input.minimumStock) ||
    input.minimumStock < 0
  ) {
    throw new Error(
      "Minimum stock must be zero or greater."
    );
  }

  if (
    !Number.isFinite(
      input.standardUnitValueCents
    ) ||
    input.standardUnitValueCents < 0
  ) {
    throw new Error(
      "Standard unit value must be zero or greater."
    );
  }

  const itemDocument = await addDoc(
    collection(db, "inventoryItems"),
    {
      companyId: input.companyId,
      companyName: input.companyName,

      projectId: input.projectId,
      projectName: input.projectName,

      itemName,
      category,

      sku: input.sku?.trim() ?? "",

      description:
        input.description?.trim() ?? "",

      trackingType: input.trackingType,

      /*
       * Temporary compatibility field for older inventory pages.
       */
      requiresSerial:
        input.trackingType === "Serialized",

      unitOfMeasure:
        input.unitOfMeasure,

      standardUnitValueCents:
        Math.round(
          input.standardUnitValueCents
        ),

      minimumStock:
        Math.max(
          0,
          Math.floor(input.minimumStock)
        ),

      isActive: true,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  return itemDocument.id;
}

export async function updateInventoryItem(
  inventoryItemId: string,
  input: UpdateInventoryItemInput
): Promise<void> {
  if (!inventoryItemId) {
    throw new Error(
      "Inventory item ID is required."
    );
  }

  const itemName = input.itemName.trim();
  const category = input.category.trim();

  if (!itemName) {
    throw new Error(
      "Item name is required."
    );
  }

  if (!category) {
    throw new Error(
      "Category is required."
    );
  }

  if (
    !input.unitOfMeasure.trim()
  ) {
    throw new Error(
      "Unit of measure is required."
    );
  }

  if (
    !Number.isFinite(input.minimumStock) ||
    input.minimumStock < 0
  ) {
    throw new Error(
      "Minimum stock must be zero or greater."
    );
  }

  if (
    !Number.isFinite(
      input.standardUnitValueCents
    ) ||
    input.standardUnitValueCents < 0
  ) {
    throw new Error(
      "Standard unit value must be zero or greater."
    );
  }

  const itemReference = doc(
    db,
    "inventoryItems",
    inventoryItemId
  );

  await updateDoc(itemReference, {
    itemName,
    category,

    sku:
      input.sku?.trim() ?? "",

    description:
      input.description?.trim() ?? "",

    unitOfMeasure:
      input.unitOfMeasure.trim(),

    standardUnitValueCents:
      Math.round(
        input.standardUnitValueCents
      ),

    minimumStock:
      Math.max(
        0,
        Math.floor(input.minimumStock)
      ),

    isActive:
      input.isActive,

    updatedAt:
      serverTimestamp(),
  });
}