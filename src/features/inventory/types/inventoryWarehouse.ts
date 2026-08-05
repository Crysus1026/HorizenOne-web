export type InventoryWarehouse = {
  id: string;

  companyId: string;
  projectId: string;

  name: string;

  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;

  isDefault: boolean;
  isActive: boolean;

  createdAt?: unknown;
  updatedAt?: unknown;
};

export type CreateInventoryWarehouseInput = {
  companyId: string;
  projectId: string;
  name: string;

  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;

  isDefault?: boolean;
};

export type UpdateInventoryWarehouseInput = {
  name: string;

  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;

  isActive: boolean;
};