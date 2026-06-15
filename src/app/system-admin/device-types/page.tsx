"use client";

import AppShell from "@/components/AppShell";
import { auth, db } from "@/lib/firebase";
import { getUserProfile } from "@/lib/getUserProfile";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Company = {
  id: string;
  name?: string;
  companyCode?: string;
  isActive?: boolean;
};

type Project = {
  id: string;
  companyId?: string;
  companyName?: string;
  name?: string;
  projectCode?: string;
  isActive?: boolean;
};

type DeviceType = {
  id: string;
  companyId?: string;
  companyName?: string;
  projectId?: string;
  projectName?: string;
  name?: string;
  deviceCode?: string;
  manufacturer?: string;
  model?: string;
  description?: string;
  isActive?: boolean;
};

export default function SystemAdminDeviceTypesPage() {
  const router = useRouter();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);

  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [companyId, setCompanyId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [deviceCode, setDeviceCode] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [description, setDescription] = useState("");

  const [editingDeviceType, setEditingDeviceType] =
  useState<DeviceType | null>(null);

  const [isUpdating, setIsUpdating] = useState(false);

  const [editCompanyId, setEditCompanyId] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editName, setEditName] = useState("");
  const [editDeviceCode, setEditDeviceCode] = useState("");
  const [editManufacturer, setEditManufacturer] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const filteredProjects = projects.filter(
    (project) => project.companyId === companyId && project.isActive
  );

  const filteredEditProjects = projects.filter(
  (project) => project.companyId === editCompanyId && project.isActive
);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      const profile = await getUserProfile(user.uid);

      if (!profile?.isSystemAdmin) {
        router.push("/dashboard");
        return;
      }

      setIsCheckingAccess(false);
      await loadData();
    });

    return () => unsubscribe();
  }, [router]);

  async function loadData() {
    setIsLoading(true);
    setError("");

    try {
      const companiesSnap = await getDocs(
        query(
          collection(db, "companies"),
          where("isActive", "==", true),
          orderBy("name", "asc")
        )
      );

      const companyList = companiesSnap.docs.map((companyDoc) => ({
        id: companyDoc.id,
        ...(companyDoc.data() as Omit<Company, "id">),
      }));

      setCompanies(companyList);

      const projectsSnap = await getDocs(
        query(collection(db, "projects"), orderBy("name", "asc"))
      );

      const projectList = projectsSnap.docs.map((projectDoc) => ({
        id: projectDoc.id,
        ...(projectDoc.data() as Omit<Project, "id">),
      }));

      setProjects(projectList);

      const deviceTypesSnap = await getDocs(
        query(collection(db, "deviceTypes"), orderBy("name", "asc"))
      );

      const deviceTypeList = deviceTypesSnap.docs.map((deviceTypeDoc) => ({
        id: deviceTypeDoc.id,
        ...(deviceTypeDoc.data() as Omit<DeviceType, "id">),
      }));

      setDeviceTypes(deviceTypeList);
    } catch (err) {
      console.error(err);
      setError("Unable to load device types.");
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setCompanyId("");
    setProjectId("");
    setName("");
    setDeviceCode("");
    setManufacturer("");
    setModel("");
    setDescription("");
  }

  async function handleCreateDeviceType(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!companyId) {
      setError("Company is required.");
      return;
    }

    if (!projectId) {
      setError("Project is required.");
      return;
    }

    if (!name.trim()) {
      setError("Device type name is required.");
      return;
    }

    if (!deviceCode.trim()) {
      setError("Device code is required.");
      return;
    }

    const selectedCompany = companies.find((company) => company.id === companyId);
    const selectedProject = projects.find((project) => project.id === projectId);

    if (!selectedCompany) {
      setError("Selected company was not found.");
      return;
    }

    if (!selectedProject) {
      setError("Selected project was not found.");
      return;
    }

    setIsSaving(true);

    try {
      await addDoc(collection(db, "deviceTypes"), {
        companyId,
        companyName: selectedCompany.name || "",
        projectId,
        projectName: selectedProject.name || "",
        name: name.trim(),
        deviceCode: deviceCode.trim(),
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        description: description.trim(),
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      resetForm();
      await loadData();
    } catch (err) {
      console.error(err);
      setError("Unable to create device type.");
    } finally {
      setIsSaving(false);
    }
  }

  function openEditDeviceType(deviceType: DeviceType) {
  setEditingDeviceType(deviceType);

  setEditCompanyId(deviceType.companyId || "");
  setEditProjectId(deviceType.projectId || "");
  setEditName(deviceType.name || "");
  setEditDeviceCode(deviceType.deviceCode || "");
  setEditManufacturer(deviceType.manufacturer || "");
  setEditModel(deviceType.model || "");
  setEditDescription(deviceType.description || "");
}

async function saveDeviceTypeChanges() {
  if (!editingDeviceType) return;

  setError("");

  if (!editCompanyId) {
    setError("Company is required.");
    return;
  }

  if (!editProjectId) {
    setError("Project is required.");
    return;
  }

  if (!editName.trim()) {
    setError("Device type name is required.");
    return;
  }

  if (!editDeviceCode.trim()) {
    setError("Device code is required.");
    return;
  }

  const selectedCompany = companies.find(
    (company) => company.id === editCompanyId
  );

  const selectedProject = projects.find(
    (project) => project.id === editProjectId
  );

  if (!selectedCompany) {
    setError("Selected company was not found.");
    return;
  }

  if (!selectedProject) {
    setError("Selected project was not found.");
    return;
  }

  setIsUpdating(true);

  try {
    await updateDoc(doc(db, "deviceTypes", editingDeviceType.id), {
      companyId: editCompanyId,
      companyName: selectedCompany.name || "",
      projectId: editProjectId,
      projectName: selectedProject.name || "",
      name: editName.trim(),
      deviceCode: editDeviceCode.trim(),
      manufacturer: editManufacturer.trim(),
      model: editModel.trim(),
      description: editDescription.trim(),
      updatedAt: serverTimestamp(),
    });

    setEditingDeviceType(null);
    await loadData();
  } catch (err) {
    console.error(err);
    setError("Unable to update device type.");
  } finally {
    setIsUpdating(false);
  }
}

  async function toggleDeviceTypeStatus(deviceType: DeviceType) {
    setError("");

    try {
      await updateDoc(doc(db, "deviceTypes", deviceType.id), {
        isActive: !deviceType.isActive,
        updatedAt: serverTimestamp(),
      });

      await loadData();
    } catch (err) {
      console.error(err);
      setError("Unable to update device type status.");
    }
  }

  if (isCheckingAccess) {
    return (
      <AppShell>
        <p className="text-sm text-slate-400">Checking access...</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 px-6 text-white">
        <div>
          <p className="text-sm font-medium text-cyan-400">
            System Administrator
          </p>
          <h1 className="text-2xl font-bold text-white">Device Types</h1>
          <p className="mt-1 text-sm text-slate-400">
            Create and manage device types under company projects.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {editingDeviceType && (
  <section className="rounded-xl border border-cyan-700 bg-slate-900 p-5 shadow-sm">
    <h2 className="text-lg font-semibold text-white">Edit Device Type</h2>

    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <label className="block">
        <span className="text-sm font-medium text-slate-300">Company *</span>
        <select
          value={editCompanyId}
          onChange={(e) => {
            setEditCompanyId(e.target.value);
            setEditProjectId("");
          }}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        >
          <option value="">Select company</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name || "Unnamed Company"}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-300">Project *</span>
        <select
          value={editProjectId}
          onChange={(e) => setEditProjectId(e.target.value)}
          disabled={!editCompanyId}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">
            {editCompanyId ? "Select project" : "Select company first"}
          </option>
          {filteredEditProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name || "Unnamed Project"}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-300">
          Device Type Name *
        </span>
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-300">
          Device Code *
        </span>
        <input
          value={editDeviceCode}
          onChange={(e) => setEditDeviceCode(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-300">Manufacturer</span>
        <input
          value={editManufacturer}
          onChange={(e) => setEditManufacturer(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-300">Model</span>
        <input
          value={editModel}
          onChange={(e) => setEditModel(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        />
      </label>

      <label className="block md:col-span-2">
        <span className="text-sm font-medium text-slate-300">Description</span>
        <textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        />
      </label>
    </div>

    <div className="mt-4 flex gap-2">
      <button
        onClick={saveDeviceTypeChanges}
        disabled={isUpdating}
        className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUpdating ? "Saving..." : "Save Changes"}
      </button>

      <button
        onClick={() => setEditingDeviceType(null)}
        className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
      >
        Cancel
      </button>
    </div>
  </section>
)}

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-white">
            Create Device Type
          </h2>

          <form onSubmit={handleCreateDeviceType} className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Company *
                </span>
                <select
                  value={companyId}
                  onChange={(e) => {
                    setCompanyId(e.target.value);
                    setProjectId("");
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                >
                  <option value="">Select company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name || "Unnamed Company"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Project *
                </span>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  disabled={!companyId}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {companyId ? "Select project" : "Select company first"}
                  </option>
                  {filteredProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name || "Unnamed Project"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Device Type Name *
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  placeholder="Example: X2S Thermostat"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Device Code *
                </span>
                <input
                  value={deviceCode}
                  onChange={(e) => setDeviceCode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  placeholder="Example: x2s-thermostat"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Manufacturer
                </span>
                <input
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  placeholder="Example: Resideo"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Model
                </span>
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  placeholder="Example: X2S"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-300">
                  Description
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  rows={4}
                  placeholder="Optional device type description"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Create Device Type"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Device Type Profiles
            </h2>

            <button
              onClick={loadData}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-slate-400">
              Loading device types...
            </p>
          ) : deviceTypes.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              No device types have been created yet.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800 text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-medium">Device Type</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Project</th>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-700">
                  {deviceTypes.map((deviceType) => (
                    <tr key={deviceType.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">
                          {deviceType.name || "Unnamed Device Type"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {[deviceType.manufacturer, deviceType.model]
                            .filter(Boolean)
                            .join(" ")}
                        </div>
                        {deviceType.description && (
                          <div className="mt-1 text-xs text-slate-500">
                            {deviceType.description}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {deviceType.companyName || "—"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {deviceType.projectName || "—"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {deviceType.deviceCode || "—"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            deviceType.isActive
                              ? "bg-cyan-900 text-cyan-300"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {deviceType.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openEditDeviceType(deviceType)}
                            className="rounded-lg border border-cyan-700 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-slate-800"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => toggleDeviceTypeStatus(deviceType)}
                            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                          >
                            {deviceType.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
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