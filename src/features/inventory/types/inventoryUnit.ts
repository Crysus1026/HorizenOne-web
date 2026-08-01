export type InventoryUnitStatus =
  | "available"
  | "assigned"
  | "installed"
  | "damaged"
  | "lost"
  | "returned";

export type InventoryUnit = {
  id: string;

  companyId: string;
  companyName?: string;

  projectId: string;
  projectName?: string;

  inventoryItemId: string;
  itemName?: string;

  serialNumber: string;
  status: InventoryUnitStatus;

  locationId?: string;
  locationName?: string;

  assignedTechnicianId?: string;
  assignedTechnicianName?: string;

  workOrderId?: string;
  workOrderNumber?: string;
};