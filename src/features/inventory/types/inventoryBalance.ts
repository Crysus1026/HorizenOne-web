export type InventoryBalanceLocationType =
  | "warehouse"
  | "technician";

export type InventoryBalance = {
  id: string;

  companyId: string;
  projectId: string;
  inventoryItemId: string;

  locationType:
    InventoryBalanceLocationType;

  locationId?: string;
  locationName: string;

  technicianId?: string;
  technicianName?: string;

  quantity: number;
};