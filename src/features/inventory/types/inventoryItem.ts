export type InventoryTrackingType = "Serialized" | "Quantity";

export type InventoryItem = {
  id: string;

  companyId: string;
  companyName: string;

  projectId: string;
  projectName: string;

  itemName: string;
  category: string;
  sku?: string;
  description?: string;

  trackingType: InventoryTrackingType;

  /**
   * Temporary compatibility field.
   * Remove after all existing inventory pages use trackingType.
   */
  requiresSerial: boolean;

  unitOfMeasure: string;
  standardUnitValueCents: number;
  minimumStock: number;

  isActive: boolean;
};

export type CreateInventoryItemInput = {
  companyId: string;
  companyName: string;

  projectId: string;
  projectName: string;

  itemName: string;
  category: string;
  sku?: string;
  description?: string;

  trackingType: InventoryTrackingType;
  unitOfMeasure: string;
  standardUnitValueCents: number;
  minimumStock: number;
};