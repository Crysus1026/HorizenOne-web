"use client";

import AppShell from "@/components/AppShell";
import Link from "next/link";
import { useUserProfile } from "@/hooks/useUserProfile";
import { getCompanyCollection } from "@/lib/companyQueries";
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Technician = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  employeeId?: string;
  companyId?: string;
  isActive?: boolean;
};

type Company = {
  id: string;
  Name?: string;
  companyCode?: string;
  isActive?: boolean;
};

export default function TechniciansPage() {
  const {
  companyId: userCompanyId,
  isSystemAdmin,
  isLoadingProfile,
  profileError,
} = useUserProfile();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadCompanies() {
  const companiesQuery = query(
    collection(db, "companies"),
    where("isActive", "==", true),
    orderBy("Name", "asc")
  );

  const snap = await getDocs(companiesQuery);

  const loadedCompanies: Company[] = snap.docs.map((document) => ({
    id: document.id,
    ...(document.data() as Omit<Company, "id">),
  }));

  setCompanies(loadedCompanies);

  if (!companyId && loadedCompanies.length > 0) {
    setCompanyId(loadedCompanies[0].id);
  }
}

useEffect(() => {
  if (isLoadingProfile) return;

  if (profileError) {
    setError(profileError);
    setIsLoading(false);
    return;
  }

  if (!isSystemAdmin && !userCompanyId) {
    setError("User is missing companyId.");
    setIsLoading(false);
    return;
  }

  async function loadTechnicians() {
    setIsLoading(true);
    setError("");

    try {
      const techniciansData = await getCompanyCollection<Technician>(
        "users",
        userCompanyId,
        isSystemAdmin,
        [
          where("role", "==", "Technician"),
          orderBy("lastName", "asc"),
        ]
      );

      setTechnicians(techniciansData);
    } catch (err) {
      console.error(err);
      setError("Unable to load technicians.");
    } finally {
      setIsLoading(false);
    }
  }

  loadTechnicians();
}, [userCompanyId, isSystemAdmin, isLoadingProfile, profileError]);


async function generateEmployeeId(selectedCompanyId: string) {
  const company = companies.find(
    (company) => company.id === selectedCompanyId
  );

  const companyCode = company?.companyCode?.trim().toUpperCase();

  if (!companyCode) {
    throw new Error("Company code is missing.");
  }

  const techniciansQuery = query(
    collection(db, "users"),
    where("companyId", "==", selectedCompanyId),
    where("role", "==", "Technician")
  );

  const snap = await getDocs(techniciansQuery);

  let highestNumber = 999;

  snap.forEach((document) => {
    const employeeId = document.data().employeeId;

    if (!employeeId || typeof employeeId !== "string") return;

    const parts = employeeId.split("-");
    const number = Number(parts[1]);

    if (!Number.isNaN(number)) {
      highestNumber = Math.max(highestNumber, number);
    }
  });

  return `${companyCode}-${highestNumber + 1}`;
}

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError("Technician name is required.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");

        if (!companyId) {
          setError("Company is required.");
          setIsSaving(false);
          return;
        }

      const generatedEmployeeId = await generateEmployeeId(companyId);

        await addDoc(collection(db, "users"), {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role: "Technician",
        companyId,
        employeeId: generatedEmployeeId,
        isActive: true,
        createdAt: serverTimestamp(),
      });

      setName("");
      setEmail("");
      setPhone("");

      const techniciansData = await getCompanyCollection<Technician>(
        "users",
        userCompanyId,
        isSystemAdmin,
        [
          where("role", "==", "Technician"),
          orderBy("lastName", "asc"),
        ]
      );

      setTechnicians(techniciansData);

    } catch (err) {
      console.error(err);
      setError("Unable to create technician.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-black p-8 text-white">
        <div className="mb-8">
          <Link
            href="/admin"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            ← Back to Admin
          </Link>

          <h1 className="mt-4 text-3xl font-bold">Technicians</h1>
          <p className="mt-2 text-sm text-slate-400">
            Create and manage technicians available for dispatch assignment.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-slate-800 bg-slate-900 p-6"
          >
            <h2 className="text-xl font-semibold">Add Technician</h2>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
                  placeholder="Mike Jones"
                />
              </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Company
                  </label>

                  <select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">Select company</option>

                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.Name || company.id}
                      </option>
                    ))}
                  </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Company ID
                </label>
                <input
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
                  placeholder="horizenone-demo"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
                  placeholder="mike@horizenone.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Phone
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
                  placeholder="555-555-5555"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="mt-6 w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Creating..." : "Create Technician"}
            </button>
          </form>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Technician List</h2>

            <div className="mt-6 space-y-3">
              {technicians.length ? (
                technicians.map((technician) => (
                  <div
                    key={technician.id}
                    className="rounded-lg border border-slate-800 bg-slate-950 p-4"
                  >
                    <p className="font-semibold">{technician.name}</p>
                    <p className="mt-1 text-sm text-slate-500"> Employee ID: {technician.employeeId || "Not set"} </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {technician.email || "No email"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {technician.phone || "No phone"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Company ID: {technician.companyId || "Not set"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No technicians have been created yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}