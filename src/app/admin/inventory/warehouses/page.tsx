"use client";

import AppShell from "@/components/AppShell";
import {
  createInventoryWarehouse,
  getWarehousesForProject,
  setDefaultWarehouse,
  updateInventoryWarehouse,
} from "@/features/inventory/services/inventoryWarehouseService";
import type { InventoryWarehouse } from "@/features/inventory/types/inventoryWarehouse";
import { getCompanyProjects } from "@/features/projects/services/projectService";
import type { Project } from "@/features/projects/types/project";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function AdminInventoryWarehousesPage() {
  const {
    profile,
    isLoadingProfile,
    profileError,
  } = useUserProfile();

  const companyId = profile?.companyId ?? "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");

  const [warehouses, setWarehouses] = useState<InventoryWarehouse[]>([]);

  const [warehouseName, setWarehouseName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [isDefault, setIsDefault] = useState(false);

  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [pageError, setPageError] = useState("");

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === projectId) ?? null;
  }, [projects, projectId]);

  const loadProjects = useCallback(async () => {
    if (!profile || !companyId) {
      setProjects([]);
      setProjectId("");
      return;
    }

    setIsLoadingProjects(true);
    setPageError("");

    try {
      const companyProjects = await getCompanyProjects(companyId);

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
        const currentProjectStillAvailable = activeProjects.some(
          (project) => project.id === currentProjectId
        );

        if (currentProjectStillAvailable) {
          return currentProjectId;
        }

        if (activeProjects.length === 1) {
          return activeProjects[0].id;
        }

        return "";
      });
    } catch (error) {
      console.error("Error loading warehouse programs:", error);

      setProjects([]);
      setProjectId("");
      setPageError("Unable to load programs.");
    } finally {
      setIsLoadingProjects(false);
    }
  }, [companyId, profile]);

  const loadWarehouses = useCallback(async () => {
    if (!companyId || !projectId) {
      setWarehouses([]);
      return;
    }

    setIsLoadingWarehouses(true);
    setPageError("");

    try {
      const warehouseData = await getWarehousesForProject({
        companyId,
        projectId,
        includeInactive: true,
      });

      setWarehouses(warehouseData);
    } catch (error) {
      console.error("Error loading warehouses:", error);

      setWarehouses([]);
      setPageError("Unable to load warehouses.");
    } finally {
      setIsLoadingWarehouses(false);
    }
  }, [companyId, projectId]);

  useEffect(() => {
    if (!isLoadingProfile && profile) {
      void loadProjects();
    }
  }, [isLoadingProfile, loadProjects, profile]);

  useEffect(() => {
    void loadWarehouses();
  }, [loadWarehouses]);

  function resetWarehouseForm() {
    setWarehouseName("");
    setAddressLine1("");
    setAddressLine2("");
    setCity("");
    setState("");
    setPostalCode("");
    setIsDefault(false);
  }

  async function handleCreateWarehouse(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selectedProject) {
      alert("Program is required.");
      return;
    }

    if (!warehouseName.trim()) {
      alert("Warehouse name is required.");
      return;
    }

    setIsSaving(true);
    setPageError("");

    try {
      await createInventoryWarehouse({
        companyId,
        projectId: selectedProject.id,
        name: warehouseName,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        isDefault,
      });

      resetWarehouseForm();

      await loadWarehouses();
    } catch (error) {
      console.error("Error creating warehouse:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Unable to create warehouse.";

      setPageError(message);
      alert(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSetDefault(
    warehouse: InventoryWarehouse
  ) {
    try {
      await setDefaultWarehouse({
        companyId,
        projectId,
        warehouseId: warehouse.id,
      });

      await loadWarehouses();
    } catch (error) {
      console.error("Error setting default warehouse:", error);
      alert("Unable to set default warehouse.");
    }
  }

  async function handleToggleActive(
    warehouse: InventoryWarehouse
  ) {
    try {
      await updateInventoryWarehouse(warehouse.id, {
        name: warehouse.name,

        addressLine1: warehouse.addressLine1 ?? "",
        addressLine2: warehouse.addressLine2 ?? "",
        city: warehouse.city ?? "",
        state: warehouse.state ?? "",
        postalCode: warehouse.postalCode ?? "",

        isActive: !warehouse.isActive,
      });

      await loadWarehouses();
    } catch (error) {
      console.error("Error updating warehouse:", error);
      alert("Unable to update warehouse.");
    }
  }

  async function handleRename(
    warehouse: InventoryWarehouse
  ) {
    const nextName = window.prompt(
      "Warehouse name:",
      warehouse.name
    );

    if (!nextName?.trim()) {
      return;
    }

    try {
      await updateInventoryWarehouse(warehouse.id, {
        name: nextName,

        addressLine1: warehouse.addressLine1 ?? "",
        addressLine2: warehouse.addressLine2 ?? "",
        city: warehouse.city ?? "",
        state: warehouse.state ?? "",
        postalCode: warehouse.postalCode ?? "",

        isActive: warehouse.isActive,
      });

      await loadWarehouses();
    } catch (error) {
      console.error("Error renaming warehouse:", error);
      alert("Unable to rename warehouse.");
    }
  }

  function formatWarehouseAddress(
    warehouse: InventoryWarehouse
  ): string {
    const street = [
      warehouse.addressLine1,
      warehouse.addressLine2,
    ]
      .filter(Boolean)
      .join(", ");

    const cityStatePostal = [
      warehouse.city,
      warehouse.state,
      warehouse.postalCode,
    ]
      .filter(Boolean)
      .join(" ");

    return [street, cityStatePostal]
      .filter(Boolean)
      .join(" • ");
  }

  if (isLoadingProfile) {
    return (
      <AppShell>
        <div className="p-8">
          <p className="text-sm text-slate-400">
            Loading warehouse setup...
          </p>
        </div>
      </AppShell>
    );
  }

  if (profileError || !profile) {
    return (
      <AppShell>
        <div className="p-8">
          <p className="text-sm text-red-300">
            {profileError || "Unable to load your profile."}
          </p>
        </div>
      </AppShell>
    );
  }

  if (!companyId) {
    return (
      <AppShell>
        <div className="p-8">
          <section className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-5">
            <h1 className="text-xl font-semibold text-white">
              Company Assignment Required
            </h1>

            <p className="mt-2 text-sm text-amber-300">
              Your profile is not assigned to a company.
            </p>
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 p-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Inventory Warehouses
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Create and manage program-specific inventory warehouses.
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
          <label className="block max-w-xl">
            <span className="text-sm font-medium text-slate-300">
              Program *
            </span>

            <select
              value={projectId}
              onChange={(event) =>
                setProjectId(event.target.value)
              }
              disabled={isLoadingProjects}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                {isLoadingProjects
                  ? "Loading programs..."
                  : "Select program"}
              </option>

              {projects.map((project) => (
                <option
                  key={project.id}
                  value={project.id}
                >
                  {project.name}
                </option>
              ))}
            </select>
          </label>
        </section>

        <form
          onSubmit={handleCreateWarehouse}
          className="rounded-xl border border-slate-800 bg-slate-900/70 p-5"
        >
          <h2 className="text-lg font-semibold text-white">
            Add Warehouse
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Add a warehouse for the selected program. The address is optional.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-300">
                Warehouse Name *
              </span>

              <input
                value={warehouseName}
                onChange={(event) =>
                  setWarehouseName(event.target.value)
                }
                disabled={!projectId}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Main Warehouse"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-300">
                Address
              </span>

              <input
                value={addressLine1}
                onChange={(event) =>
                  setAddressLine1(event.target.value)
                }
                disabled={!projectId}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="123 Main Street"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-300">
                Address Line 2
              </span>

              <input
                value={addressLine2}
                onChange={(event) =>
                  setAddressLine2(event.target.value)
                }
                disabled={!projectId}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Suite, unit, building, etc."
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                City
              </span>

              <input
                value={city}
                onChange={(event) =>
                  setCity(event.target.value)
                }
                disabled={!projectId}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Baltimore"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                State
              </span>

              <input
                value={state}
                onChange={(event) =>
                  setState(event.target.value)
                }
                disabled={!projectId}
                maxLength={2}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 uppercase text-white disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="MD"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                ZIP / Postal Code
              </span>

              <input
                value={postalCode}
                onChange={(event) =>
                  setPostalCode(event.target.value)
                }
                disabled={!projectId}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="21201"
              />
            </label>

            <label className="flex items-end gap-3 pb-2">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(event) =>
                  setIsDefault(event.target.checked)
                }
                disabled={!projectId}
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-300">
                Set as default warehouse
              </span>
            </label>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={isSaving || !projectId}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Add Warehouse"}
            </button>
          </div>
        </form>

        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Existing Warehouses
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {selectedProject
                ? `Warehouses configured for ${selectedProject.name}.`
                : "Select a program to view its warehouses."}
            </p>
          </div>

          {!projectId ? (
            <p className="mt-4 text-sm text-slate-400">
              Select a program above.
            </p>
          ) : isLoadingWarehouses ? (
            <p className="mt-4 text-sm text-slate-400">
              Loading warehouses...
            </p>
          ) : warehouses.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              No warehouses have been created for this program.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {warehouses.map((warehouse) => {
                const formattedAddress =
                  formatWarehouseAddress(warehouse);

                return (
                  <div
                    key={warehouse.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950 p-4"
                  >
                    <div>
                      <p className="font-medium text-white">
                        {warehouse.name}
                      </p>

                      {formattedAddress ? (
                        <p className="mt-1 text-sm text-slate-400">
                          {formattedAddress}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-slate-500">
                          No address entered
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {warehouse.isDefault ? (
                          <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-cyan-300">
                            Default
                          </span>
                        ) : null}

                        {!warehouse.isActive ? (
                          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-300">
                            Inactive
                          </span>
                        ) : (
                          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-emerald-300">
                            Active
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!warehouse.isDefault &&
                      warehouse.isActive ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleSetDefault(warehouse)
                          }
                          className="rounded-md border border-cyan-500/40 px-3 py-1 text-sm text-cyan-300 hover:bg-cyan-500/10"
                        >
                          Set Default
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() =>
                          handleRename(warehouse)
                        }
                        className="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800"
                      >
                        Rename
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleToggleActive(warehouse)
                        }
                        className="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800"
                      >
                        {warehouse.isActive
                          ? "Deactivate"
                          : "Activate"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}