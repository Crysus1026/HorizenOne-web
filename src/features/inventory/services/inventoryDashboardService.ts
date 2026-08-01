import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import type { InventoryItem } from "../types/inventoryItem";
import type { InventoryUnit } from "../types/inventoryUnit";

type GetInventoryDashboardInput = {
  companyId: string;
  projectId: string;
};

type InventoryDashboardData = {
  items: InventoryItem[];
  units: InventoryUnit[];
};

export async function getInventoryDashboard({
  companyId,
  projectId,
}: GetInventoryDashboardInput): Promise<InventoryDashboardData> {
  if (!companyId) {
    return {
      items: [],
      units: [],
    };
  }

  const itemConstraints = [
    where("companyId", "==", companyId),
    orderBy("itemName", "asc"),
  ];

  const unitConstraints = [
    where("companyId", "==", companyId),
  ];

  if (projectId) {
    itemConstraints.splice(
      1,
      0,
      where("projectId", "==", projectId)
    );

    unitConstraints.push(
      where("projectId", "==", projectId)
    );
  }

  const itemsQuery = query(
    collection(db, "inventoryItems"),
    ...itemConstraints
  );

  const unitsQuery = query(
    collection(db, "inventoryUnits"),
    ...unitConstraints
  );

  const [itemsSnapshot, unitsSnapshot] = await Promise.all([
    getDocs(itemsQuery),
    getDocs(unitsQuery),
  ]);

  const items: InventoryItem[] = itemsSnapshot.docs.map((document) => {
    const data = document.data();

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

      trackingType:
        data.trackingType === "Quantity"
          ? "Quantity"
          : "Serialized",

      requiresSerial:
        typeof data.requiresSerial === "boolean"
          ? data.requiresSerial
          : data.trackingType !== "Quantity",

      unitOfMeasure: data.unitOfMeasure || "Each",
      standardUnitValueCents:
        Number(data.standardUnitValueCents) || 0,
      minimumStock: Number(data.minimumStock) || 0,

      isActive: data.isActive !== false,
    };
  });

  const units: InventoryUnit[] = unitsSnapshot.docs.map((document) => {
    const data = document.data();

    return {
      id: document.id,

      companyId: data.companyId ?? "",
      projectId: data.projectId ?? "",

      inventoryItemId: data.inventoryItemId ?? "",
      itemName: data.itemName ?? "",

      serialNumber: data.serialNumber ?? "",

      assignedTechnicianId:
        data.assignedTechnicianId ?? "",
      assignedTechnicianName:
        data.assignedTechnicianName ?? "",

      status: data.status ?? "available",
    };
  });

  return {
    items,
    units,
  };
}