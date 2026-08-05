"use client";

import AppShell from "@/components/AppShell";
import {
  getInventoryItemById,
  updateInventoryItem,
} from "@/features/inventory/services/inventoryItemService";
import type { InventoryItem } from "@/features/inventory/types/inventoryItem";
import {
  convertDollarsToCents,
  formatCurrencyFromCents,
} from "@/features/inventory/utils/inventoryValue";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditInventoryItemPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const inventoryItemId = params.id;

  const [item, setItem] = useState<InventoryItem | null>(null);

  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [unitOfMeasure, setUnitOfMeasure] = useState("Each");
  const [standardUnitValue, setStandardUnitValue] = useState("");
  const [minimumStock, setMinimumStock] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadItem() {
      if (!inventoryItemId) {
        setPageError("Inventory item ID is missing.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setPageError("");

      try {
        const inventoryItem =
          await getInventoryItemById(inventoryItemId);

        if (isCancelled) {
          return;
        }

        if (!inventoryItem) {
          setItem(null);
          setPageError("Inventory item was not found.");
          return;
        }

        setItem(inventoryItem);

        setItemName(inventoryItem.itemName ?? "");
        setCategory(inventoryItem.category ?? "");
        setSku(inventoryItem.sku ?? "");
        setDescription(inventoryItem.description ?? "");
        setUnitOfMeasure(
          inventoryItem.unitOfMeasure || "Each"
        );

        setStandardUnitValue(
          (
            (inventoryItem.standardUnitValueCents || 0) /
            100
          ).toFixed(2)
        );

        setMinimumStock(
          String(inventoryItem.minimumStock || 0)
        );

        setIsActive(inventoryItem.isActive !== false);
      } catch (error) {
        console.error(
          "Error loading inventory item:",
          error
        );

        if (!isCancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load inventory item.";

          setPageError(message);
          setItem(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadItem();

    return () => {
      isCancelled = true;
    };
  }, [inventoryItemId]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!item) {
      return;
    }

    const normalizedItemName = itemName.trim();
    const normalizedCategory = category.trim();

    if (!normalizedItemName) {
      alert("Item name is required.");
      return;
    }

    if (!normalizedCategory) {
      alert("Category is required.");
      return;
    }

    const parsedMinimumStock = Number(minimumStock);

    if (
      !Number.isFinite(parsedMinimumStock) ||
      parsedMinimumStock < 0
    ) {
      alert("Minimum stock must be zero or greater.");
      return;
    }

    const parsedStandardUnitValue = standardUnitValue.trim()
      ? Number(standardUnitValue)
      : 0;

    if (
      !Number.isFinite(parsedStandardUnitValue) ||
      parsedStandardUnitValue < 0
    ) {
      alert(
        "Standard unit value must be zero or greater."
      );
      return;
    }

    setIsSaving(true);
    setPageError("");

    try {
      await updateInventoryItem(
        inventoryItemId,
        {
          itemName: normalizedItemName,
          category: normalizedCategory,
          sku,
          description,
          unitOfMeasure,

          standardUnitValueCents:
            convertDollarsToCents(
              standardUnitValue
            ),

          minimumStock: Math.floor(
            parsedMinimumStock
          ),

          isActive,
        }
      );

      router.push("/admin/inventory/items");
      router.refresh();
    } catch (error) {
      console.error(
        "Error updating inventory item:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to update inventory item.";

      setPageError(message);
      alert(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-8">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">
              Loading inventory item...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!item) {
    return (
      <AppShell>
        <div className="space-y-4 p-8">
          <section className="rounded-xl border border-red-900/60 bg-red-950/30 p-5">
            <h1 className="text-xl font-semibold text-white">
              Unable to Load Inventory Item
            </h1>

            <p className="mt-2 text-sm text-red-300">
              {pageError ||
                "The inventory item could not be found."}
            </p>
          </section>

          <Link
            href="/admin/inventory/items"
            className="inline-block text-sm font-medium text-cyan-400 hover:text-cyan-300"
          >
            ← Back to Inventory Item Setup
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 p-8">
        <div>
          <Link
            href="/admin/inventory/items"
            className="text-sm font-medium text-cyan-400 hover:text-cyan-300"
          >
            ← Back to Inventory Item Setup
          </Link>

          <h1 className="mt-3 text-2xl font-semibold text-white">
            Edit Inventory Item
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Update the inventory item configuration and
            standard value.
          </p>
        </div>

        {pageError ? (
          <div className="rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-3">
            <p className="text-sm text-red-300">
              {pageError}
            </p>
          </div>
        ) : null}

        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold text-white">
            Inventory Configuration
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Program and tracking type cannot be changed from
            this page.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Program
              </span>

              <input
                value={
                  item.projectName ||
                  "No program assigned"
                }
                readOnly
                className="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-500"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Tracking Type
              </span>

              <input
                value={item.trackingType}
                readOnly
                className="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-500"
              />
            </label>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-800 bg-slate-900/70 p-5"
        >
          <h2 className="text-lg font-semibold text-white">
            Item Details
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Item Name *
              </span>

              <input
                value={itemName}
                onChange={(event) =>
                  setItemName(event.target.value)
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Category *
              </span>

              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
              >
                <option value="">
                  Select category
                </option>
                <option value="Thermostat">
                  Thermostat
                </option>
                <option value="LCR">LCR</option>
                <option value="Consumable">
                  Consumable
                </option>
                <option value="Equipment">
                  Equipment
                </option>
                <option value="Part">Part</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                SKU / Part Number
              </span>

              <input
                value={sku}
                onChange={(event) =>
                  setSku(event.target.value)
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Unit of Measure *
              </span>

              <select
                value={unitOfMeasure}
                onChange={(event) =>
                  setUnitOfMeasure(
                    event.target.value
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
              >
                <option value="Each">Each</option>
                <option value="Box">Box</option>
                <option value="Case">Case</option>
                <option value="Foot">Foot</option>
                <option value="Roll">Roll</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Minimum Stock
              </span>

              <input
                type="number"
                min="0"
                step="1"
                value={minimumStock}
                onChange={(event) =>
                  setMinimumStock(
                    event.target.value
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Standard Unit Value
              </span>

              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  $
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={standardUnitValue}
                  onChange={(event) =>
                    setStandardUnitValue(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-7 pr-2 text-white"
                />
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Current value:{" "}
                {formatCurrencyFromCents(
                  item.standardUnitValueCents
                )}
              </p>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-300">
                Description
              </span>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                className="mt-1 min-h-24 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
              />
            </label>

            <label className="flex items-center gap-3 md:col-span-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) =>
                  setIsActive(
                    event.target.checked
                  )
                }
                className="h-4 w-4 rounded border-slate-700 bg-slate-800"
              />

              <span className="text-sm text-slate-300">
                Active inventory item
              </span>
            </label>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Link
              href="/admin/inventory/items"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}