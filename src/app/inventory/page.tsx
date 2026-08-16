"use client";

import AppShell from "@/components/AppShell";
import { getInventoryDashboard } from "@/features/inventory/services/inventoryDashboardService";
import type { InventoryBalance } from "@/features/inventory/types/inventoryBalance";
import type { InventoryItem } from "@/features/inventory/types/inventoryItem";
import type { InventoryUnit } from "@/features/inventory/types/inventoryUnit";
import {
  buildInventoryDashboardRows,
  groupAssignedInventoryByTechnician,
} from "@/features/inventory/utils/inventoryDashboard";
import { getCompanyProjects } from "@/features/projects/services/projectService";
import type { Project } from "@/features/projects/types/project";
import { useUserProfile } from "@/hooks/useUserProfile";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function InventoryPage() {
  const {
    profile,
    isLoadingProfile,
    profileError,
  } = useUserProfile();

  /*
   * Use stable primitive values in effect dependency arrays.
   * Depending on the complete profile object can cause repeated reloads
   * if the hook returns a newly constructed object after a render.
   */
  const companyId = profile?.companyId ?? "";
  const role = profile?.role ?? "";
  const isSystemAdmin =
    profile?.isSystemAdmin === true;

  const assignedProjectIds =
    Array.isArray(profile?.projectIds)
      ? profile.projectIds
      : [];

  const assignedProjectIdsKey =
    assignedProjectIds.join("|");

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [
    selectedProjectId,
    setSelectedProjectId,
  ] = useState("");

  const [items, setItems] =
    useState<InventoryItem[]>([]);

  const [units, setUnits] =
    useState<InventoryUnit[]>([]);

  const [balances, setBalances] =
    useState<InventoryBalance[]>([]);

  const [
    isLoadingProjects,
    setIsLoadingProjects,
  ] = useState(false);

  const [
    isLoadingInventory,
    setIsLoadingInventory,
  ] = useState(false);

  const [pageError, setPageError] =
    useState("");

  const [
    expandedTechnicians,
    setExpandedTechnicians,
  ] = useState<Record<string, boolean>>(
    {}
  );

  /*
   * SELECTED PROGRAM
   */

  const selectedProject = useMemo(() => {
    return (
      projects.find(
        (project) =>
          project.id ===
          selectedProjectId
      ) ?? null
    );
  }, [projects, selectedProjectId]);

  /*
   * LOAD AVAILABLE PROGRAMS
   */

  useEffect(() => {
    let isCancelled = false;

    async function loadProjects() {
      if (isLoadingProfile) {
        return;
      }

      if (!companyId) {
        if (!isCancelled) {
          setProjects([]);
          setSelectedProjectId("");
          setItems([]);
          setUnits([]);
          setBalances([]);
          setIsLoadingProjects(false);
        }

        return;
      }

      setIsLoadingProjects(true);
      setPageError("");

      try {
        const companyProjects =
          await getCompanyProjects(
            companyId
          );

        if (isCancelled) {
          return;
        }

        const canAccessAllCompanyProjects =
          role === "Admin" ||
          isSystemAdmin;

        const authorizedProjects =
          canAccessAllCompanyProjects
            ? companyProjects
            : companyProjects.filter(
                (project) =>
                  assignedProjectIds.includes(
                    project.id
                  )
              );

        const activeProjects =
          authorizedProjects.filter(
            (project) =>
              project.isActive !== false
          );

        setProjects(activeProjects);

        setSelectedProjectId(
          (currentProjectId) => {
            const currentProjectStillAvailable =
              activeProjects.some(
                (project) =>
                  project.id ===
                  currentProjectId
              );

            if (
              currentProjectStillAvailable
            ) {
              return currentProjectId;
            }

            if (
              activeProjects.length === 1
            ) {
              return activeProjects[0].id;
            }

            return "";
          }
        );
      } catch (error) {
        console.error(
          "Error loading inventory programs:",
          error
        );

        if (!isCancelled) {
          setProjects([]);
          setSelectedProjectId("");
          setItems([]);
          setUnits([]);
          setBalances([]);

          setPageError(
            "Unable to load available programs."
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingProjects(false);
        }
      }
    }

    void loadProjects();

    return () => {
      isCancelled = true;
    };
  }, [
    assignedProjectIdsKey,
    companyId,
    isLoadingProfile,
    isSystemAdmin,
    role,
  ]);

  /*
   * LOAD INVENTORY
   *
   * This now loads:
   *
   * - inventoryItems
   * - serialized inventoryUnits
   * - quantity inventoryBalances
   */

  useEffect(() => {
    let isCancelled = false;

    async function loadInventory() {
      if (
        isLoadingProfile ||
        isLoadingProjects ||
        !companyId ||
        !selectedProjectId
      ) {
        if (!isCancelled) {
          setItems([]);
          setUnits([]);
          setBalances([]);
          setIsLoadingInventory(false);
        }

        return;
      }

      setIsLoadingInventory(true);
      setPageError("");

      try {
        const dashboardData =
          await getInventoryDashboard({
            companyId,
            projectId:
              selectedProjectId,
          });

        if (isCancelled) {
          return;
        }

        setItems(
          dashboardData.items
        );

        setUnits(
          dashboardData.units
        );

        setBalances(
          dashboardData.balances
        );
      } catch (error) {
        console.error(
          "Error loading inventory:",
          error
        );

        if (!isCancelled) {
          setItems([]);
          setUnits([]);
          setBalances([]);

          setPageError(
            "Unable to load inventory for the selected program."
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingInventory(false);
        }
      }
    }

    void loadInventory();

    return () => {
      isCancelled = true;
    };
  }, [
    companyId,
    isLoadingProfile,
    isLoadingProjects,
    selectedProjectId,
  ]);

  /*
   * BUILD ITEM ROWS
   *
   * Serialized inventory derives counts from inventoryUnits.
   * Quantity inventory derives counts from inventoryBalances.
   */

  const inventoryRows =
    useMemo(() => {
      return buildInventoryDashboardRows(
        items,
        units,
        balances
      );
    }, [items, units, balances]);

  /*
   * SERIALIZED INVENTORY BY TECHNICIAN
   *
   * This section currently remains serialized-only.
   */

  const assignedByTechnician =
    useMemo(() => {
      return groupAssignedInventoryByTechnician(
        units
      );
    }, [units]);

  /*
   * DASHBOARD TOTALS
   *
   * These now use the combined inventory rows instead of
   * counting serialized inventoryUnits directly.
   *
   * Therefore both serialized and quantity inventory are included.
   */

  const totalAvailable =
    useMemo(() => {
      return inventoryRows.reduce(
        (total, item) =>
          total + item.available,
        0
      );
    }, [inventoryRows]);

  const totalAssigned =
    useMemo(() => {
      return inventoryRows.reduce(
        (total, item) =>
          total + item.assigned,
        0
      );
    }, [inventoryRows]);

  const totalLowStock =
    useMemo(() => {
      return inventoryRows.filter(
        (item) =>
          item.isLowStock
      ).length;
    }, [inventoryRows]);

  /*
   * HELPERS
   */

  function toggleTechnician(
    technicianName: string
  ) {
    setExpandedTechnicians(
      (current) => ({
        ...current,

        [technicianName]:
          !current[technicianName],
      })
    );
  }

  function handleProjectChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const nextProjectId =
      event.target.value;

    setSelectedProjectId(
      nextProjectId
    );

    setItems([]);
    setUnits([]);
    setBalances([]);

    setExpandedTechnicians({});
    setPageError("");
  }

  /*
   * PAGE STATES
   */

  if (isLoadingProfile) {
    return (
      <AppShell>
        <p className="text-sm text-slate-400">
          Loading inventory setup...
        </p>
      </AppShell>
    );
  }

  if (
    profileError ||
    !profile
  ) {
    return (
      <AppShell>
        <section className="rounded-xl border border-red-900/60 bg-red-950/30 p-5">
          <h1 className="text-xl font-semibold text-white">
            Unable to Load
            Inventory
          </h1>

          <p className="mt-2 text-sm text-red-300">
            {profileError ||
              "Unable to load your user profile."}
          </p>
        </section>
      </AppShell>
    );
  }

  if (!companyId) {
    return (
      <AppShell>
        <section className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-5">
          <h1 className="text-xl font-semibold text-white">
            Company Assignment
            Required
          </h1>

          <p className="mt-2 text-sm text-amber-300">
            Your user profile is not
            assigned to a company.
          </p>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* HEADER */}

        <div>
          <h1 className="text-2xl font-semibold text-white">
            Inventory
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            {selectedProject
              ? `View inventory for ${selectedProject.name}.`
              : "Select a program to view its inventory."}
          </p>
        </div>

        {/* ERROR */}

        {pageError ? (
          <section className="rounded-xl border border-red-900/60 bg-red-950/30 p-4">
            <p className="text-sm text-red-300">
              {pageError}
            </p>
          </section>
        ) : null}

        {/* PROGRAM SELECTOR */}

        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <label className="block max-w-xl">
            <span className="text-sm font-medium text-slate-300">
              Program
            </span>

            <select
              value={
                selectedProjectId
              }
              onChange={
                handleProjectChange
              }
              disabled={
                isLoadingProjects
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                {isLoadingProjects
                  ? "Loading programs..."
                  : "Select program"}
              </option>

              {projects.map(
                (project) => (
                  <option
                    key={
                      project.id
                    }
                    value={
                      project.id
                    }
                  >
                    {project.name}
                  </option>
                )
              )}
            </select>
          </label>

          {!isLoadingProjects &&
          projects.length === 0 ? (
            <p className="mt-3 text-sm text-amber-300">
              No active programs are
              available for your
              account.
            </p>
          ) : null}
        </section>

        {!selectedProjectId ? (
          <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">
              Select a program to view
              its inventory.
            </p>
          </section>
        ) : isLoadingInventory ? (
          <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">
              Loading inventory...
            </p>
          </section>
        ) : (
          <>
            {/* SUMMARY CARDS */}

            <section className="grid gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">
                  Item Types
                </p>

                <p className="mt-2 text-2xl font-semibold text-white">
                  {items.length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">
                  Available Units
                </p>

                <p className="mt-2 text-2xl font-semibold text-white">
                  {totalAvailable}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">
                  Assigned Units
                </p>

                <p className="mt-2 text-2xl font-semibold text-white">
                  {totalAssigned}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">
                  Low Stock Items
                </p>

                <p className="mt-2 text-2xl font-semibold text-white">
                  {totalLowStock}
                </p>
              </div>
            </section>

            {/* INVENTORY ITEMS */}

            <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Inventory Items
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Serialized and
                  quantity inventory
                  levels for the
                  selected program.
                </p>
              </div>

              {inventoryRows.length ===
              0 ? (
                <p className="mt-4 text-sm text-slate-400">
                  No inventory items
                  have been created
                  for this program.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-800 text-slate-400">
                      <tr>
                        <th className="py-2 pr-4">
                          Item
                        </th>

                        <th className="py-2 pr-4">
                          Type
                        </th>

                        <th className="py-2 pr-4">
                          Category
                        </th>

                        <th className="py-2 pr-4">
                          SKU
                        </th>

                        <th className="py-2 pr-4">
                          Available
                        </th>

                        <th className="py-2 pr-4">
                          Assigned
                        </th>

                        <th className="py-2 pr-4">
                          Installed
                        </th>

                        <th className="py-2 pr-4">
                          Damaged
                        </th>

                        <th className="py-2 pr-4">
                          Lost
                        </th>

                        <th className="py-2 pr-4">
                          Returned
                        </th>

                        <th className="py-2 pr-4">
                          Minimum
                        </th>

                        <th className="py-2 pr-4">
                          Status
                        </th>

                        <th className="py-2 pr-4">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {inventoryRows.map(
                        (item) => (
                          <tr
                            key={
                              item.id
                            }
                            className="border-b border-slate-800 text-slate-200"
                          >
                            <td className="py-3 pr-4 font-medium text-white">
                              {
                                item.itemName
                              }
                            </td>

                            <td className="py-3 pr-4">
                              <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300">
                                {item.trackingType ===
                                "Quantity"
                                  ? "Quantity"
                                  : "Serialized"}
                              </span>
                            </td>

                            <td className="py-3 pr-4">
                              {
                                item.category
                              }
                            </td>

                            <td className="py-3 pr-4">
                              {item.sku ||
                                "—"}
                            </td>

                            <td className="py-3 pr-4 font-medium text-white">
                              {
                                item.available
                              }
                            </td>

                            <td className="py-3 pr-4">
                              {
                                item.assigned
                              }
                            </td>

                            <td className="py-3 pr-4">
                              {item.trackingType ===
                              "Quantity"
                                ? "—"
                                : item.installed}
                            </td>

                            <td className="py-3 pr-4">
                              {item.trackingType ===
                              "Quantity"
                                ? "—"
                                : item.damaged}
                            </td>

                            <td className="py-3 pr-4">
                              {item.trackingType ===
                              "Quantity"
                                ? "—"
                                : item.lost}
                            </td>

                            <td className="py-3 pr-4">
                              {item.trackingType ===
                              "Quantity"
                                ? "—"
                                : item.returned}
                            </td>

                            <td className="py-3 pr-4">
                              {item.minimumStock ||
                                0}
                            </td>

                            <td className="py-3 pr-4">
                              {item.isLowStock ? (
                                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-300">
                                  Low Stock
                                </span>
                              ) : (
                                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">
                                  OK
                                </span>
                              )}
                            </td>

                            <td className="py-3 pr-4">
                              <Link
                                href={`/inventory/${item.id}`}
                                className="text-cyan-400 hover:text-cyan-300"
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* SERIALIZED ASSIGNED INVENTORY */}

            <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold text-white">
                Assigned Serialized
                Inventory by Technician
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                View serialized
                inventory currently
                assigned to
                technicians. Quantity
                inventory assignments
                are reflected in the
                inventory table above.
              </p>

              {Object.keys(
                assignedByTechnician
              ).length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">
                  No serialized
                  inventory is
                  currently assigned
                  to technicians.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {Object.entries(
                    assignedByTechnician
                  )
                    .sort(
                      (
                        [
                          technicianNameA,
                        ],
                        [
                          technicianNameB,
                        ]
                      ) =>
                        technicianNameA.localeCompare(
                          technicianNameB
                        )
                    )
                    .map(
                      ([
                        technicianName,
                        technicianUnits,
                      ]) => {
                        const isExpanded =
                          expandedTechnicians[
                            technicianName
                          ] === true;

                        return (
                          <div
                            key={
                              technicianName
                            }
                            className="overflow-hidden rounded-lg border border-slate-800 bg-black/40"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                toggleTechnician(
                                  technicianName
                                )
                              }
                              aria-expanded={
                                isExpanded
                              }
                              className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-slate-900/60"
                            >
                              <div>
                                <h3 className="font-semibold text-white">
                                  {
                                    technicianName
                                  }
                                </h3>

                                <p className="text-sm text-slate-500">
                                  {
                                    technicianUnits.length
                                  }{" "}
                                  assigned
                                  unit
                                  {technicianUnits.length ===
                                  1
                                    ? ""
                                    : "s"}
                                </p>
                              </div>

                              <span
                                className={`shrink-0 text-lg text-slate-400 transition-transform ${
                                  isExpanded
                                    ? "rotate-180"
                                    : ""
                                }`}
                              >
                                ▼
                              </span>
                            </button>

                            {isExpanded ? (
                              <div className="space-y-2 border-t border-slate-800 p-4">
                                {technicianUnits
                                  .slice()
                                  .sort(
                                    (
                                      unitA,
                                      unitB
                                    ) =>
                                      (
                                        unitA.itemName ||
                                        ""
                                      ).localeCompare(
                                        unitB.itemName ||
                                          ""
                                      )
                                  )
                                  .map(
                                    (
                                      unit
                                    ) => (
                                      <Link
                                        key={
                                          unit.id
                                        }
                                        href={`/inventory/units/${unit.id}`}
                                        className="block rounded-md border border-slate-800 bg-slate-950 p-3 transition hover:border-cyan-500/50"
                                      >
                                        <p className="text-sm font-medium text-white">
                                          {unit.itemName ||
                                            "Inventory Item"}
                                        </p>

                                        <p className="mt-1 text-sm text-cyan-400">
                                          {unit.serialNumber ||
                                            "No serial number"}
                                        </p>
                                      </Link>
                                    )
                                  )}
                              </div>
                            ) : null}
                          </div>
                        );
                      }
                    )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}