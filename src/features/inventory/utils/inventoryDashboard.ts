import type { InventoryItem } from "../types/inventoryItem";
import type { InventoryUnit } from "../types/inventoryUnit";

export type InventoryDashboardRow = InventoryItem & {
  available: number;
  assigned: number;
  installed: number;
  damaged: number;
  lost: number;
  returned: number;
  total: number;
  isLowStock: boolean;
};

export function buildInventoryDashboardRows(
  items: InventoryItem[],
  units: InventoryUnit[]
): InventoryDashboardRow[] {
  const unitsByItem = new Map<string, InventoryUnit[]>();

  for (const unit of units) {
    const currentUnits =
      unitsByItem.get(unit.inventoryItemId) ?? [];

    currentUnits.push(unit);
    unitsByItem.set(unit.inventoryItemId, currentUnits);
  }

  return items.map((item) => {
    const itemUnits = unitsByItem.get(item.id) ?? [];

    const counts = {
      available: 0,
      assigned: 0,
      installed: 0,
      damaged: 0,
      lost: 0,
      returned: 0,
    };

    for (const unit of itemUnits) {
      if (unit.status in counts) {
        counts[unit.status as keyof typeof counts] += 1;
      }
    }

    const minimumStock = item.minimumStock || 0;

    return {
      ...item,
      ...counts,
      total: itemUnits.length,
      isLowStock:
        minimumStock > 0 &&
        counts.available < minimumStock,
    };
  });
}

export function groupAssignedInventoryByTechnician(
  units: InventoryUnit[]
): Record<string, InventoryUnit[]> {
  return units
    .filter((unit) => unit.status === "assigned")
    .reduce<Record<string, InventoryUnit[]>>(
      (groups, unit) => {
        const technicianName =
          unit.assignedTechnicianName ||
          "Unassigned Technician";

        groups[technicianName] ??= [];
        groups[technicianName].push(unit);

        return groups;
      },
      {}
    );
}

export function countUnitsByStatus(
  units: InventoryUnit[],
  status: InventoryUnit["status"]
): number {
  return units.filter((unit) => unit.status === status).length;
}