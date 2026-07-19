"use client";

import AppShell from "@/components/AppShell";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Technician = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  companyId?: string;
  projectIds?: string[];
};

type Project = {
  id: string;
  companyId?: string;
  name?: string;
  projectCode?: string;
  isActive?: boolean;
};

function getTechnicianName(technician: Technician | null) {
  if (!technician) {
    return "Technician";
  }

  return (
    technician.name ||
    `${technician.firstName || ""} ${
      technician.lastName || ""
    }`.trim() ||
    technician.email ||
    "Unnamed Technician"
  );
}

export default function TechnicianProgramsPage() {
  const params = useParams<{ technicianId: string }>();
  const technicianId = params.technicianId;

  const [technician, setTechnician] =
    useState<Technician | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] =
    useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadPage() {
      if (!technicianId) {
        setError("Technician ID is missing.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError("");

        const technicianSnapshot = await getDoc(
          doc(db, "users", technicianId)
        );

        if (!technicianSnapshot.exists()) {
          setError("Technician was not found.");
          return;
        }

        const loadedTechnician: Technician = {
          id: technicianSnapshot.id,
          ...(technicianSnapshot.data() as Omit<
            Technician,
            "id"
          >),
        };

        setTechnician(loadedTechnician);
        setSelectedProjectIds(
          Array.isArray(loadedTechnician.projectIds)
            ? loadedTechnician.projectIds
            : []
        );

        if (!loadedTechnician.companyId) {
          setError("Technician is missing a company ID.");
          return;
        }

        const projectsQuery = query(
          collection(db, "projects"),
          where(
            "companyId",
            "==",
            loadedTechnician.companyId
          ),
          where("isActive", "==", true),
          orderBy("name", "asc")
        );

        const projectsSnapshot = await getDocs(projectsQuery);

        const loadedProjects: Project[] =
          projectsSnapshot.docs.map((projectDocument) => ({
            id: projectDocument.id,
            ...(projectDocument.data() as Omit<
              Project,
              "id"
            >),
          }));

        setProjects(loadedProjects);
      } catch (loadError) {
        console.error(
          "Unable to load technician programs:",
          loadError
        );

        setError("Unable to load technician programs.");
      } finally {
        setIsLoading(false);
      }
    }

    loadPage();
  }, [technicianId]);

  function toggleProject(projectId: string) {
    setSelectedProjectIds((currentProjectIds) => {
      if (currentProjectIds.includes(projectId)) {
        return currentProjectIds.filter(
          (currentProjectId) =>
            currentProjectId !== projectId
        );
      }

      return [...currentProjectIds, projectId];
    });

    setSuccessMessage("");
  }

  function selectAllProjects() {
    setSelectedProjectIds(
      projects.map((project) => project.id)
    );

    setSuccessMessage("");
  }

  function clearProjects() {
    setSelectedProjectIds([]);
    setSuccessMessage("");
  }

  async function handleSave() {
    if (!technician) {
      setError("Technician information is unavailable.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setSuccessMessage("");

      await updateDoc(doc(db, "users", technician.id), {
        projectIds: selectedProjectIds,
        updatedAt: serverTimestamp(),
      });

      setTechnician((currentTechnician) =>
        currentTechnician
          ? {
              ...currentTechnician,
              projectIds: selectedProjectIds,
            }
          : currentTechnician
      );

      setSuccessMessage(
        "Program assignments saved successfully."
      );
    } catch (saveError) {
      console.error(
        "Unable to save technician programs:",
        saveError
      );

      setError("Unable to save technician programs.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-black p-8 text-white">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/admin/technicians"
            className="text-sm text-cyan-400 hover:text-cyan-300"
          >
            ← Back to Technicians
          </Link>

          <div className="mt-4">
            <h1 className="text-3xl font-bold">
              Manage Programs
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Assign the programs this technician is eligible
              to work.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mt-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-300">
              {successMessage}
            </div>
          )}

          {isLoading ? (
            <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
              Loading programs...
            </div>
          ) : technician ? (
            <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    {getTechnicianName(technician)}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Select every program this technician may be
                    scheduled for.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={selectAllProjects}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    Select All
                  </button>

                  <button
                    type="button"
                    onClick={clearProjects}
                    className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {projects.length === 0 ? (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-300">
                    No active programs were found for this
                    technician&apos;s company.
                  </div>
                ) : (
                  projects.map((project) => {
                    const isSelected =
                      selectedProjectIds.includes(project.id);

                    return (
                      <label
                        key={project.id}
                        className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950 p-4 hover:border-cyan-500/50"
                      >
                        <div>
                          <p className="font-medium text-white">
                            {project.name || "Unnamed Program"}
                          </p>

                          {project.projectCode && (
                            <p className="mt-1 text-sm text-slate-500">
                              {project.projectCode}
                            </p>
                          )}
                        </div>

                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            toggleProject(project.id)
                          }
                          className="h-5 w-5 cursor-pointer accent-cyan-500"
                        />
                      </label>
                    );
                  })
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving
                    ? "Saving..."
                    : "Save Program Assignments"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}