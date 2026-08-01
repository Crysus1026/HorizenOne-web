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
  projectId?: string;

  inventoryItemId: string;
  itemName?: string;

  serialNumber?: string;

  assignedTechnicianId?: string;
  assignedTechnicianName?: string;

  status: InventoryUnitStatus;
};