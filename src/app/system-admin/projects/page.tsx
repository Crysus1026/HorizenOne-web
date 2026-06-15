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
  description?: string;
  isActive?: boolean;
};

export default function SystemAdminProjectsPage() {
  const router = useRouter();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [companyId, setCompanyId] = useState("");
  const [name, setName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [description, setDescription] = useState("");

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [editCompanyId, setEditCompanyId] = useState("");
  const [editName, setEditName] = useState("");
  const [editProjectCode, setEditProjectCode] = useState("");
  const [editDescription, setEditDescription] = useState("");

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
    } catch (err) {
      console.error(err);
      setError("Unable to load projects.");
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setCompanyId("");
    setName("");
    setProjectCode("");
    setDescription("");
  }

  async function handleCreateProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!companyId) {
      setError("Company is required.");
      return;
    }

    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    if (!projectCode.trim()) {
      setError("Project code is required.");
      return;
    }

    const selectedCompany = companies.find((company) => company.id === companyId);

    if (!selectedCompany) {
      setError("Selected company was not found.");
      return;
    }

    setIsSaving(true);

    try {
      await addDoc(collection(db, "projects"), {
        companyId,
        companyName: selectedCompany.name || "",
        name: name.trim(),
        projectCode: projectCode.trim(),
        description: description.trim(),
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      resetForm();
      await loadData();
    } catch (err) {
      console.error(err);
      setError("Unable to create project.");
    } finally {
      setIsSaving(false);
    }
  }

  function openEditProject(project: Project) {
  setEditingProject(project);

  setEditCompanyId(project.companyId || "");
  setEditName(project.name || "");
  setEditProjectCode(project.projectCode || "");
  setEditDescription(project.description || "");
}

async function saveProjectChanges() {
  if (!editingProject) return;

  setError("");

  if (!editCompanyId) {
    setError("Company is required.");
    return;
  }

  if (!editName.trim()) {
    setError("Project name is required.");
    return;
  }

  if (!editProjectCode.trim()) {
    setError("Project code is required.");
    return;
  }

  const selectedCompany = companies.find(
    (company) => company.id === editCompanyId
  );

  if (!selectedCompany) {
    setError("Selected company was not found.");
    return;
  }

  setIsUpdating(true);

  try {
    await updateDoc(doc(db, "projects", editingProject.id), {
      companyId: editCompanyId,
      companyName: selectedCompany.name || "",
      name: editName.trim(),
      projectCode: editProjectCode.trim(),
      description: editDescription.trim(),
      updatedAt: serverTimestamp(),
    });

    setEditingProject(null);
    await loadData();
  } catch (err) {
    console.error(err);
    setError("Unable to update project.");
  } finally {
    setIsUpdating(false);
  }
}

  async function toggleProjectStatus(project: Project) {
    setError("");

    try {
      await updateDoc(doc(db, "projects", project.id), {
        isActive: !project.isActive,
        updatedAt: serverTimestamp(),
      });

      await loadData();
    } catch (err) {
      console.error(err);
      setError("Unable to update project status.");
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
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="mt-1 text-sm text-slate-400">
            Create and manage projects under company profiles.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {editingProject && (
  <section className="rounded-xl border border-cyan-700 bg-slate-900 p-5 shadow-sm">
    <h2 className="text-lg font-semibold text-white">Edit Project</h2>

    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <label className="block">
        <span className="text-sm font-medium text-slate-300">
          Company *
        </span>
        <select
          value={editCompanyId}
          onChange={(e) => setEditCompanyId(e.target.value)}
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
          Project Name *
        </span>
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-300">
          Project Code *
        </span>
        <input
          value={editProjectCode}
          onChange={(e) => setEditProjectCode(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        />
      </label>

      <label className="block md:col-span-2">
        <span className="text-sm font-medium text-slate-300">
          Description
        </span>
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
        onClick={saveProjectChanges}
        disabled={isUpdating}
        className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUpdating ? "Saving..." : "Save Changes"}
      </button>

      <button
        onClick={() => setEditingProject(null)}
        className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
      >
        Cancel
      </button>
    </div>
  </section>
)}

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-white">Create Project</h2>

          <form onSubmit={handleCreateProject} className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Company *
                </span>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
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
                  Project Name *
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  placeholder="Example: BGE PeakRewards"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Project Code *
                </span>
                <input
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  placeholder="Example: bge-peakrewards"
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
                  placeholder="Optional project description"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Create Project"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Project Profiles
            </h2>

            <button
              onClick={loadData}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-slate-400">Loading projects...</p>
          ) : projects.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              No projects have been created yet.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800 text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-medium">Project</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-700">
                  {projects.map((project) => (
                    <tr key={project.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">
                          {project.name || "Unnamed Project"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {project.description || ""}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {project.companyName || "—"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {project.projectCode || "—"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            project.isActive
                              ? "bg-cyan-900 text-cyan-300"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {project.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openEditProject(project)}
                            className="rounded-lg border border-cyan-700 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-slate-800"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => toggleProjectStatus(project)}
                            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                          >
                            {project.isActive ? "Deactivate" : "Activate"}
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