"use client";

import AppShell from "@/components/AppShell";
import { db } from "@/lib/firebase";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditServiceTypePage() {
  const params = useParams();
  const router = useRouter();

  const serviceTypeId = params.id as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [requiredSkillsText, setRequiredSkillsText] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadServiceType() {
      try {
        const serviceTypeRef = doc(db, "serviceTypes", serviceTypeId);
        const serviceTypeSnap = await getDoc(serviceTypeRef);

        if (!serviceTypeSnap.exists()) {
          setError("Service type not found.");
          return;
        }

        const data = serviceTypeSnap.data();

        setName(data.name || "");
        setDescription(data.description || "");
        setDurationMinutes(data.durationMinutes || 60);
        setRequiredSkillsText((data.requiredSkills || []).join(", "));
        setIsActive(data.isActive ?? true);
      } catch (err) {
        console.error(err);
        setError("Unable to load service type.");
      } finally {
        setIsLoading(false);
      }
    }

    if (serviceTypeId) {
      loadServiceType();
    }
  }, [serviceTypeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setIsSaving(true);
    setError("");

    const requiredSkills = requiredSkillsText
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    try {
      const serviceTypeRef = doc(db, "serviceTypes", serviceTypeId);

      await updateDoc(serviceTypeRef, {
        name,
        description,
        durationMinutes: Number(durationMinutes),
        requiredSkills,
        isActive,
        updatedAt: serverTimestamp(),
      });

      router.push("/admin/service-types");
    } catch (err) {
      console.error(err);
      setError("Unable to update service type.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-8 text-slate-400">Loading service type...</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-8">
          <Link
            href="/admin/service-types"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back to Service Types
          </Link>

          <h1 className="mt-4 text-3xl font-bold">Edit Service Type</h1>
          <p className="mt-2 text-slate-400">
            Update service catalog settings used for work orders.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="max-w-3xl rounded-xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="text-sm font-medium text-slate-300">
                Service Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-2 min-h-28 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Default Duration Minutes
              </label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) =>
                  setDurationMinutes(Number(e.target.value))
                }
                min={1}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Required Skills
              </label>
              <input
                type="text"
                value={requiredSkillsText}
                onChange={(e) => setRequiredSkillsText(e.target.value)}
                placeholder="HVAC, Electrical, Plumbing"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
              <p className="mt-2 text-xs text-slate-500">
                Separate skills with commas.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="isActive"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <label htmlFor="isActive" className="text-sm text-slate-300">
                Service type is active
              </label>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <Link
              href="/admin/service-types"
              className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}