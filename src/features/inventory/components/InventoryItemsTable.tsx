import type { InventoryItem } from "../types/inventoryItem";
import { formatCurrencyFromCents } from "../utils/inventoryValue";

type InventoryItemsTableProps = {
  items: InventoryItem[];
  isLoading: boolean;
  hasSelectedProject: boolean;
  selectedProjectName?: string;
};

export function InventoryItemsTable({
  items,
  isLoading,
  hasSelectedProject,
  selectedProjectName,
}: InventoryItemsTableProps) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <div>
        <h2 className="text-lg font-semibold text-white">
          Existing Inventory Items
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          {selectedProjectName
            ? `Items configured for ${selectedProjectName}.`
            : "Select a program to view its inventory items."}
        </p>
      </div>

      {!hasSelectedProject ? (
        <p className="mt-4 text-sm text-slate-400">
          Select a program above.
        </p>
      ) : isLoading ? (
        <p className="mt-4 text-sm text-slate-400">
          Loading inventory items...
        </p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">
          No inventory items have been created for this program.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-2 pr-4">Item</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Tracking</th>
                <th className="py-2 pr-4">Unit</th>
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Min Stock</th>
                <th className="py-2 pr-4">Unit Value</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-800 text-slate-200"
                >
                  <td className="py-3 pr-4 font-medium text-white">
                    {item.itemName}
                  </td>

                  <td className="py-3 pr-4">
                    {item.category}
                  </td>

                  <td className="py-3 pr-4">
                    {item.trackingType}
                  </td>

                  <td className="py-3 pr-4">
                    {item.unitOfMeasure}
                  </td>

                  <td className="py-3 pr-4">
                    {item.sku || "—"}
                  </td>

                  <td className="py-3 pr-4">
                    {item.minimumStock}
                  </td>

                  <td className="py-3 pr-4">
                    {formatCurrencyFromCents(
                      item.standardUnitValueCents
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}