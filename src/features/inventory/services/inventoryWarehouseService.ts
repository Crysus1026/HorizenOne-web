import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import type {
  CreateInventoryWarehouseInput,
  InventoryWarehouse,
  UpdateInventoryWarehouseInput,
} from "../types/inventoryWarehouse";

export async function getWarehousesForProject({
  companyId,
  projectId,
  includeInactive = false,
}: {
  companyId: string;
  projectId: string;
  includeInactive?: boolean;
}): Promise<InventoryWarehouse[]> {
  if (!companyId || !projectId) {
    return [];
  }

  const warehousesQuery = query(
    collection(db, "inventoryWarehouses"),
    where("companyId", "==", companyId),
    where("projectId", "==", projectId),
    orderBy("name", "asc")
  );

  const snapshot = await getDocs(warehousesQuery);

  const warehouses = snapshot.docs.map((warehouseDocument) => {
    const data = warehouseDocument.data();

    return {
      id: warehouseDocument.id,

      companyId: data.companyId ?? "",
      projectId: data.projectId ?? "",

      name: data.name ?? "",

      isDefault: data.isDefault === true,
      isActive: data.isActive !== false,

      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } satisfies InventoryWarehouse;
  });

  return includeInactive
    ? warehouses
    : warehouses.filter(
        (warehouse) => warehouse.isActive
      );
}

export async function createInventoryWarehouse(
  input: CreateInventoryWarehouseInput
): Promise<string> {
  const name = input.name.trim();

  if (!input.companyId) {
    throw new Error("Company is required.");
  }

  if (!input.projectId) {
    throw new Error("Program is required.");
  }

  if (!name) {
    throw new Error("Warehouse name is required.");
  }

  const warehouseDocument = await addDoc(
    collection(db, "inventoryWarehouses"),
    {
      companyId: input.companyId,
      projectId: input.projectId,

      name,
      addressLine1: input.addressLine1?.trim() ?? "",
      addressLine2: input.addressLine2?.trim() ?? "",
      city: input.city?.trim() ?? "",
      state: input.state?.trim() ?? "",
      postalCode: input.postalCode?.trim() ?? "",

      isDefault: input.isDefault === true,
      isActive: true,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  if (input.isDefault === true) {
    await setDefaultWarehouse({
      companyId: input.companyId,
      projectId: input.projectId,
      warehouseId: warehouseDocument.id,
    });
  }

  return warehouseDocument.id;
}

export async function updateInventoryWarehouse(
  warehouseId: string,
  input: UpdateInventoryWarehouseInput
): Promise<void> {
  if (!warehouseId) {
    throw new Error("Warehouse ID is required.");
  }

  const name = input.name.trim();

  if (!name) {
    throw new Error("Warehouse name is required.");
  }

  await updateDoc(
    doc(db, "inventoryWarehouses", warehouseId),
    {
        name,

        addressLine1: input.addressLine1?.trim() ?? "",
        addressLine2: input.addressLine2?.trim() ?? "",
        city: input.city?.trim() ?? "",
        state: input.state?.trim() ?? "",
        postalCode: input.postalCode?.trim() ?? "",

        isActive: input.isActive,
        updatedAt: serverTimestamp(),
    }
    );
}

export async function setDefaultWarehouse({
  companyId,
  projectId,
  warehouseId,
}: {
  companyId: string;
  projectId: string;
  warehouseId: string;
}): Promise<void> {
  if (!companyId || !projectId || !warehouseId) {
    throw new Error(
      "Company, program, and warehouse are required."
    );
  }

  const warehousesQuery = query(
    collection(db, "inventoryWarehouses"),
    where("companyId", "==", companyId),
    where("projectId", "==", projectId)
  );

  const snapshot = await getDocs(warehousesQuery);

  const batch = writeBatch(db);

  snapshot.docs.forEach((warehouseDocument) => {
    batch.update(warehouseDocument.ref, {
      isDefault:
        warehouseDocument.id === warehouseId,
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

export async function getDefaultWarehouse({
  companyId,
  projectId,
}: {
  companyId: string;
  projectId: string;
}): Promise<InventoryWarehouse | null> {
  const warehouses = await getWarehousesForProject({
    companyId,
    projectId,
  });

  return (
    warehouses.find(
      (warehouse) => warehouse.isDefault
    ) ?? null
  );
}