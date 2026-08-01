import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import type {
  CreateInventoryItemInput,
  InventoryItem,
  InventoryTrackingType,
} from "../types/inventoryItem";

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

  return snapshot.docs.map((document) => {
    const data = document.data();

    const trackingType: InventoryTrackingType =
      data.trackingType === "Quantity"
        ? "Quantity"
        : "Serialized";

    return {
      id: document.id,

      companyId: data.companyId ?? "",
      companyName: data.companyName ?? "",

      projectId: data.projectId ?? "",
      projectName: data.projectName ?? "",

      itemName: data.itemName ?? "",
      category: data.category ?? "",
      sku: data.sku ?? "",
      description: data.description ?? "",

      trackingType,

      requiresSerial:
        typeof data.requiresSerial === "boolean"
          ? data.requiresSerial
          : trackingType === "Serialized",

      unitOfMeasure: data.unitOfMeasure || "Each",
      standardUnitValueCents:
        Number(data.standardUnitValueCents) || 0,
      minimumStock: Number(data.minimumStock) || 0,

      isActive: data.isActive !== false,
    };
  });
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
    throw new Error("Minimum stock must be zero or greater.");
  }

  if (
    !Number.isFinite(input.standardUnitValueCents) ||
    input.standardUnitValueCents < 0
  ) {
    throw new Error("Standard unit value must be zero or greater.");
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
      description: input.description?.trim() ?? "",

      trackingType: input.trackingType,

      /*
       * Temporary compatibility field for older inventory pages.
       */
      requiresSerial: input.trackingType === "Serialized",

      unitOfMeasure: input.unitOfMeasure,
      standardUnitValueCents: input.standardUnitValueCents,
      minimumStock: Math.floor(input.minimumStock),

      isActive: true,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  return itemDocument.id;
}