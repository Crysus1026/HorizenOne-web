"use client";

import AppShell from "@/components/AppShell";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

type Company = {
  id: string;
  name: string;
  isActive?: boolean;
};

type Project = {
  id: string;
  companyId: string;
  name: string;
  isActive?: boolean;
};

type InventoryItem = {
  id: string;
  companyId: string;
  companyName: string;
  projectId?: string;
  projectName?: string;
  itemName: string;
  category: string;
  sku?: string;
  description?: string;
  requiresSerial: boolean;
  minimumStock: number;
  defaultLocationName?: string;
  isActive: boolean;
};

export default function SystemAdminInventoryItemsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);

  const [companyId, setCompanyId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [minimumStock, setMinimumStock] = useState("0");
  const [defaultLocationName, setDefaultLocationName] = useState("Main Warehouse");

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const selectedCompany = useMemo(() => {
    return companies.find((company) => company.id === companyId);
  }, [companies, companyId]);

  const filteredProjects = useMemo(() => {
    if (!companyId) return [];
    return projects.filter((project) => project.companyId === companyId);
  }, [projects, companyId]);

  async function loadData() {
    setIsLoading(true);

    try {
      const companiesSnapshot = await getDocs(
        query(collection(db, "companies"), orderBy("name", "asc"))
      );

      const companiesData = companiesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Company, "id">),
      }));

      const projectsSnapshot = await getDocs(
        query(collection(db, "projects"), orderBy("name", "asc"))
      );

      const projectsData = projectsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Project, "id">),
      }));

      const itemsSnapshot = await getDocs(
        query(collection(db, "inventoryItems"), orderBy("itemName", "asc"))
      );

      const itemsData = itemsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<InventoryItem, "id">),
      }));

      setCompanies(companiesData);
      setProjects(projectsData);
      setItems(itemsData);
    } catch (error) {
      console.error("Error loading inventory item setup:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreateItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!companyId || !selectedCompany || !itemName.trim() || !category.trim()) {
      alert("Company, item name, and category are required.");
      return;
    }

    const selectedProject = projects.find((project) => project.id === projectId);

    setIsSaving(true);

    try {
      await addDoc(collection(db, "inventoryItems"), {
        companyId,
        companyName: selectedCompany.name,

        projectId: selectedProject?.id || "",
        projectName: selectedProject?.name || "",

        itemName: itemName.trim(),
        category: category.trim(),
        sku: sku.trim(),
        description: description.trim(),

        requiresSerial: true,
        minimumStock: Number(minimumStock) || 0,
        defaultLocationName: defaultLocationName.trim(),

        isActive: true,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setProjectId("");
      setItemName("");
      setCategory("");
      setSku("");
      setDescription("");
      setMinimumStock("0");
      setDefaultLocationName("Main Warehouse");

      await loadData();
    } catch (error) {
      console.error("Error creating inventory item:", error);
      alert("Unable to create inventory item.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Inventory Item Setup
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Create serialized inventory item types that can later be received,
            assigned, installed, damaged, or lost.
          </p>
        </div>

        <form
          onSubmit={handleCreateItem}
          className="rounded-xl border border-slate-800 bg-slate-900/70 p-5"
        >
          <h2 className="text-lg font-semibold text-white">
            Create Inventory Item
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Company *
              </span>
              <select
                value={companyId}
                onChange={(event) => {
                  setCompanyId(event.target.value);
                  setProjectId("");
                }}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
              >
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Project
              </span>
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
              >
                <option value="">No project</option>
                {filteredProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Item Name *
              </span>
              <input
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
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
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                >
                  <option value="">Select Category</option>

                  <option value="Thermostat">Thermostat</option>
                  <option value="LCR">LCR</option>
                </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                SKU / Part Number
              </span>
              <input
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                placeholder="X2S"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-300">
                Minimum Stock
              </span>
              <input
                type="number"
                value={minimumStock}
                onChange={(event) => setMinimumStock(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-300">
                Default Location
              </span>
              <input
                value={defaultLocationName}
                onChange={(event) => setDefaultLocationName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                placeholder="Received"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-300">
                Description
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1 min-h-24 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                placeholder="Optional item notes"
              />
            </label>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Create Inventory Item"}
            </button>
          </div>
        </form>

        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold text-white">
            Existing Inventory Items
          </h2>

          {isLoading ? (
            <p className="mt-4 text-sm text-slate-400">Loading...</p>
          ) : items.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              No inventory items have been created yet.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2 pr-4">Item</th>
                    <th className="py-2 pr-4">Company</th>
                    <th className="py-2 pr-4">Project</th>
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4">SKU</th>
                    <th className="py-2 pr-4">Min Stock</th>
                    <th className="py-2 pr-4">Location</th>
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
                      <td className="py-3 pr-4">{item.companyName}</td>
                      <td className="py-3 pr-4">
                        {item.projectName || "—"}
                      </td>
                      <td className="py-3 pr-4">{item.category}</td>
                      <td className="py-3 pr-4">{item.sku || "—"}</td>
                      <td className="py-3 pr-4">{item.minimumStock}</td>
                      <td className="py-3 pr-4">
                        {item.defaultLocationName || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}