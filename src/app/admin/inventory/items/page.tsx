"use client";

import AppShell from "@/components/AppShell";
import { useUserProfile } from "@/hooks/useUserProfile";
import { db } from "@/lib/firebase";
import { InventoryItemsTable } from "@/features/inventory/components/InventoryItemsTable";
import {
  createInventoryItem,
  getInventoryItemsForProject,
} from "@/features/inventory/services/inventoryItemService";
import type {
  InventoryItem,
  InventoryTrackingType,
} from "@/features/inventory/types/inventoryItem";
import { convertDollarsToCents } from "@/features/inventory/utils/inventoryValue";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";

type Project = {
  id: string;
  companyId: string;
  name: string;
  isActive?: boolean;
};

export default function AdminInventoryItemsPage() {
  const {
    profile,
    isLoadingProfile,
    profileError,
  } = useUserProfile();

  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);

  const [projectId, setProjectId] = useState("");
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [trackingType, setTrackingType] =
    useState<InventoryTrackingType>("Serialized");
  const [unitOfMeasure, setUnitOfMeasure] = useState("Each");
  const [standardUnitValue, setStandardUnitValue] = useState("");
  const [minimumStock, setMinimumStock] = useState("0");

  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [pageError, setPageError] = useState("");

  const companyId = profile?.companyId ?? "";
  const companyName = profile?.companyName ?? "";

  const selectedProject = useMemo(() => {
    return (
      projects.find((project) => project.id === projectId) ?? null
    );
  }, [projectId, projects]);

  const loadProjects = useCallback(async () => {
    if (!profile || !companyId) {
      setProjects([]);
      setProjectId("");
      return;
    }

    setIsLoadingProjects(true);
    setPageError("");

    try {
      const projectsQuery = query(
        collection(db, "projects"),
        where("companyId", "==", companyId),
        orderBy("name", "asc")
      );

      const projectsSnapshot = await getDocs(projectsQuery);

      const companyProjects = projectsSnapshot.docs.map(
        (projectDocument) => ({
          id: projectDocument.id,
          ...(projectDocument.data() as Omit<Project, "id">),
        })
      );

      const assignedProjectIds = Array.isArray(profile.projectIds)
        ? profile.projectIds
        : [];

      const authorizedProjects =
        profile.role === "Admin" || profile.isSystemAdmin
          ? companyProjects
          : companyProjects.filter((project) =>
              assignedProjectIds.includes(project.id)
            );

      const activeProjects = authorizedProjects.filter(
        (project) => project.isActive !== false
      );

      setProjects(activeProjects);

      setProjectId((currentProjectId) => {
        const currentProjectIsAvailable = activeProjects.some(
          (project) => project.id === currentProjectId
        );

        if (currentProjectIsAvailable) {
          return currentProjectId;
        }

        if (activeProjects.length === 1) {
          return activeProjects[0].id;
        }

        return "";
      });
    } catch (error) {
      console.error("Error loading inventory programs:", error);

      setProjects([]);
      setProjectId("");
      setPageError("Unable to load available programs.");
    } finally {
      setIsLoadingProjects(false);
    }
  }, [companyId, profile]);

  const loadItems = useCallback(async () => {
    if (!companyId || !projectId) {
      setItems([]);
      return;
    }

    setIsLoadingItems(true);
    setPageError("");

    try {
      const inventoryItems = await getInventoryItemsForProject({
        companyId,
        projectId,
      });

      setItems(inventoryItems);
    } catch (error) {
      console.error("Error loading inventory items:", error);

      setItems([]);
      setPageError(
        "Unable to load inventory items for this program."
      );
    } finally {
      setIsLoadingItems(false);
    }
  }, [companyId, projectId]);

  useEffect(() => {
    if (!isLoadingProfile && profile) {
      loadProjects();
    }
  }, [isLoadingProfile, loadProjects, profile]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  function resetForm() {
    setItemName("");
    setCategory("");
    setSku("");
    setDescription("");
    setTrackingType("Serialized");
    setUnitOfMeasure("Each");
    setStandardUnitValue("");
    setMinimumStock("0");
  }

  async function handleCreateItem(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!profile || !companyId) {
      alert("Your company profile could not be determined.");
      return;
    }

    if (!selectedProject) {
      alert("Program is required.");
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
      alert("Standard unit value must be zero or greater.");
      return;
    }

    setIsSaving(true);
    setPageError("");

    try {
      await createInventoryItem({
        companyId,
        companyName,

        projectId: selectedProject.id,
        projectName: selectedProject.name,

        itemName: normalizedItemName,
        category: normalizedCategory,
        sku,
        description,

        trackingType,
        unitOfMeasure,

        standardUnitValueCents:
          convertDollarsToCents(standardUnitValue),

        minimumStock: Math.floor(parsedMinimumStock),
      });

      resetForm();
      await loadItems();
    } catch (error) {
      console.error("Error creating inventory item:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to create inventory item.";

      setPageError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoadingProfile) {
    return (
      <AppShell>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-sm text-slate-400">
            Loading inventory setup...
          </p>
        </div>
      </AppShell>
    );
  }

  if (profileError || !profile) {
    return (
      <AppShell>
        <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-5">
          <h1 className="text-xl font-semibold text-white">
            Unable to Load Inventory Setup
          </h1>

          <p className="mt-2 text-sm text-red-300">
            {profileError || "Your user profile could not be loaded."}
          </p>
        </div>
      </AppShell>
    );
  }

  if (!companyId) {
    return (
      <AppShell>
        <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-5">
          <h1 className="text-xl font-semibold text-white">
            Company Assignment Required
          </h1>

          <p className="mt-2 text-sm text-amber-300">
            Your user profile is not assigned to a company.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 p-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Inventory Item Setup
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Create serialized or quantity-based inventory item types
            for a specific program.
          </p>
        </div>

        {pageError ? (
          <div className="rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-3">
            <p className="text-sm text-red-300">{pageError}</p>
          </div>
        ) : null}

        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <label className="block max-w-xl">
            <span className="text-sm font-medium text-slate-300">
              Program *
            </span>

            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              disabled={isLoadingProjects}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                {isLoadingProjects
                  ? "Loading programs..."
                  : "Select program"}
              </option>

              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          {!isLoadingProjects && projects.length === 0 ? (
            <p className="mt-3 text-sm text-amber-300">
              No active programs are available for your account.
            </p>
          ) : null}
        </section>

        <form
          onSubmit={handleCreateItem}
          className="rounded-xl border border-slate-800 bg-slate-900/70 p-5"
        >
          <h2 className="text-lg font-semibold text-white">
            Create Inventory Item
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            The item will be created for{" "}
            <span className="font-medium text-slate-200">
              {selectedProject?.name || "the selected program"}
            </span>
            .
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Item Name *
              </span>

              <input
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
                disabled={!projectId}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="X2S Smart Thermostat"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Category *
              </span>

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                disabled={!projectId}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Select category</option>
                <option value="Thermostat">Thermostat</option>
                <option value="LCR">LCR</option>
                <option value="Consumable">Consumable</option>
                <option value="Equipment">Equipment</option>
                <option value="Part">Part</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Tracking Type *
              </span>

              <select
                value={trackingType}
                onChange={(event) =>
                  setTrackingType(
                    event.target.value as InventoryTrackingType
                  )
                }
                disabled={!projectId}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="Serialized">Serialized</option>
                <option value="Quantity">Quantity</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Unit of Measure *
              </span>

              <select
                value={unitOfMeasure}
                onChange={(event) =>
                  setUnitOfMeasure(event.target.value)
                }
                disabled={!projectId}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
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
                SKU / Part Number
              </span>

              <input
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                disabled={!projectId}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="X2S"
              />
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
                  setMinimumStock(event.target.value)
                }
                disabled={!projectId}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
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
                    setStandardUnitValue(event.target.value)
                  }
                  disabled={!projectId}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-7 pr-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="0.00"
                />
              </div>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-300">
                Description
              </span>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                disabled={!projectId}
                className="mt-1 min-h-24 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Optional item notes"
              />
            </label>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={isSaving || !projectId}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Create Inventory Item"}
            </button>
          </div>
        </form>

        <InventoryItemsTable
          items={items}
          isLoading={isLoadingItems}
          hasSelectedProject={Boolean(projectId)}
          selectedProjectName={selectedProject?.name}
        />
      </div>
    </AppShell>
  );
}