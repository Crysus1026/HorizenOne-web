import type { InventoryBalance } from "../types/inventoryBalance";
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
  units: InventoryUnit[],
  balances: InventoryBalance[]
): InventoryDashboardRow[] {
  const unitsByItem = new Map<string, InventoryUnit[]>();

  for (const unit of units) {
    const currentUnits =
      unitsByItem.get(unit.inventoryItemId) ?? [];

    currentUnits.push(unit);
    unitsByItem.set(
      unit.inventoryItemId,
      currentUnits
    );
  }

  const balancesByItem =
    new Map<string, InventoryBalance[]>();

  for (const balance of balances) {
    const currentBalances =
      balancesByItem.get(
        balance.inventoryItemId
      ) ?? [];

    currentBalances.push(balance);

    balancesByItem.set(
      balance.inventoryItemId,
      currentBalances
    );
  }

  return items.map((item) => {
    /*
     * QUANTITY INVENTORY
     *
     * Warehouse balances are treated as available.
     * Technician balances are treated as assigned.
     *
     * Installed / damaged / lost / returned are not yet
     * tracked as separate quantity dispositions.
     */
    if (
      item.trackingType === "Quantity"
    ) {
      const itemBalances =
        balancesByItem.get(item.id) ?? [];

      const available =
        itemBalances
          .filter(
            (balance) =>
              balance.locationType ===
              "warehouse"
          )
          .reduce(
            (total, balance) =>
              total +
              Math.max(
                0,
                balance.quantity
              ),
            0
          );

      const assigned =
        itemBalances
          .filter(
            (balance) =>
              balance.locationType ===
              "technician"
          )
          .reduce(
            (total, balance) =>
              total +
              Math.max(
                0,
                balance.quantity
              ),
            0
          );

      const total =
        available + assigned;

      const minimumStock =
        item.minimumStock || 0;

      return {
        ...item,

        available,
        assigned,

        installed: 0,
        damaged: 0,
        lost: 0,
        returned: 0,

        total,

        isLowStock:
          minimumStock > 0 &&
          available < minimumStock,
      };
    }

    /*
     * SERIALIZED INVENTORY
     */

    const itemUnits =
      unitsByItem.get(item.id) ?? [];

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
        counts[
          unit.status as keyof typeof counts
        ] += 1;
      }
    }

    const minimumStock =
      item.minimumStock || 0;

    return {
      ...item,
      ...counts,

      total:
        itemUnits.length,

      isLowStock:
        minimumStock > 0 &&
        counts.available <
          minimumStock,
    };
  });
}

export function groupAssignedInventoryByTechnician(
  units: InventoryUnit[]
): Record<string, InventoryUnit[]> {
  return units
    .filter(
      (unit) =>
        unit.status === "assigned"
    )
    .reduce<
      Record<
        string,
        InventoryUnit[]
      >
    >(
      (groups, unit) => {
        const technicianName =
          unit.assignedTechnicianName ||
          "Unassigned Technician";

        groups[
          technicianName
        ] ??= [];

        groups[
          technicianName
        ].push(unit);

        return groups;
      },
      {}
    );
}

export function countUnitsByStatus(
  units: InventoryUnit[],
  status: InventoryUnit["status"]
): number {
  return units.filter(
    (unit) =>
      unit.status === status
  ).length;
}