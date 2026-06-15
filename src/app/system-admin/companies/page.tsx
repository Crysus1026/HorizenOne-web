"use client";

import AppShell from "@/components/AppShell";
import { auth, db } from "@/lib/firebase";
import { getUserProfile } from "@/lib/getUserProfile";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Company = {
  id: string;
  name?: string;
  companyCode?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  isActive?: boolean;
};

export default function SystemAdminCompaniesPage() {
  const router = useRouter();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [zip, setZip] = useState("");

  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [editName, setEditName] = useState("");
  const [editCompanyCode, setEditCompanyCode] = useState("");
  const [editContactName, setEditContactName] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editStateValue, setEditStateValue] = useState("");
  const [editZip, setEditZip] = useState("");

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
      await loadCompanies();
    });

    return () => unsubscribe();
  }, [router]);

  async function loadCompanies() {
    setIsLoading(true);

    try {
      const companiesQuery = query(
        collection(db, "companies"),
        orderBy("name", "asc")
      );

      const snap = await getDocs(companiesQuery);

      const companyList = snap.docs.map((companyDoc) => ({
        id: companyDoc.id,
        ...(companyDoc.data() as Omit<Company, "id">),
      }));

      setCompanies(companyList);
    } catch (err) {
      console.error(err);
      setError("Unable to load companies.");
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setCompanyCode("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setAddress("");
    setCity("");
    setStateValue("");
    setZip("");
  }

  async function handleCreateCompany(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Company name is required.");
      return;
    }

    if (!companyCode.trim()) {
      setError("Company code is required.");
      return;
    }

    setIsSaving(true);

    try {
      await addDoc(collection(db, "companies"), {
        name: name.trim(),
        companyCode: companyCode.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        address: address.trim(),
        city: city.trim(),
        state: stateValue.trim(),
        zip: zip.trim(),
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      resetForm();
      await loadCompanies();
    } catch (err) {
      console.error(err);
      setError("Unable to create company.");
    } finally {
      setIsSaving(false);
    }
  }

  function openEditCompany(company: Company) {
  setEditingCompany(company);
  setEditName(company.name || "");
  setEditCompanyCode(company.companyCode || "");
  setEditContactName(company.contactName || "");
  setEditContactEmail(company.contactEmail || "");
  setEditContactPhone(company.contactPhone || "");
  setEditAddress(company.address || "");
  setEditCity(company.city || "");
  setEditStateValue(company.state || "");
  setEditZip(company.zip || "");
}

async function saveCompanyChanges() {
  if (!editingCompany) return;

  setError("");

  if (!editName.trim()) {
    setError("Company name is required.");
    return;
  }

  if (!editCompanyCode.trim()) {
    setError("Company code is required.");
    return;
  }

  setIsUpdating(true);

  try {
    await updateDoc(doc(db, "companies", editingCompany.id), {
      name: editName.trim(),
      companyCode: editCompanyCode.trim(),
      contactName: editContactName.trim(),
      contactEmail: editContactEmail.trim(),
      contactPhone: editContactPhone.trim(),
      address: editAddress.trim(),
      city: editCity.trim(),
      state: editStateValue.trim(),
      zip: editZip.trim(),
      updatedAt: serverTimestamp(),
    });

    setEditingCompany(null);
    await loadCompanies();
  } catch (err) {
    console.error(err);
    setError("Unable to update company.");
  } finally {
    setIsUpdating(false);
  }
}

  async function toggleCompanyStatus(company: Company) {
    setError("");

    try {
      await updateDoc(doc(db, "companies", company.id), {
        isActive: !company.isActive,
        updatedAt: serverTimestamp(),
      });

      await loadCompanies();
    } catch (err) {
      console.error(err);
      setError("Unable to update company status.");
    }
  }

  if (isCheckingAccess) {
    return (
      <AppShell>
        <p className="text-sm text-slate-500">Checking access...</p>
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
          <h1 className="text-2xl font-bold text-white">Companies</h1>
          <p className="mt-1 text-sm text-slate-400">
            Create and manage company profiles for HorizenOne.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {editingCompany && (
  <section className="rounded-xl border border-cyan-700 bg-slate-900 p-5 shadow-sm">
    <h2 className="text-lg font-semibold text-white">Edit Company</h2>

    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <label className="block">
        <span className="text-sm font-medium text-slate-300">
          Company Name *
        </span>
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-300">
          Company Code *
        </span>
        <input
          value={editCompanyCode}
          onChange={(e) => setEditCompanyCode(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-300">
          Contact Name
        </span>
        <input
          value={editContactName}
          onChange={(e) => setEditContactName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-300">
          Contact Email
        </span>
        <input
          type="email"
          value={editContactEmail}
          onChange={(e) => setEditContactEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-300">
          Contact Phone
        </span>
        <input
          value={editContactPhone}
          onChange={(e) => setEditContactPhone(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-300">
          Address
        </span>
        <input
          value={editAddress}
          onChange={(e) => setEditAddress(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-300">
          City
        </span>
        <input
          value={editCity}
          onChange={(e) => setEditCity(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-300">
            State
          </span>
          <input
            value={editStateValue}
            onChange={(e) => setEditStateValue(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-300">
            ZIP
          </span>
          <input
            value={editZip}
            onChange={(e) => setEditZip(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
          />
        </label>
      </div>
    </div>

    <div className="mt-4 flex gap-2">
      <button
        onClick={saveCompanyChanges}
        disabled={isUpdating}
        className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUpdating ? "Saving..." : "Save Changes"}
      </button>

      <button
        onClick={() => setEditingCompany(null)}
        className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
      >
        Cancel
      </button>
    </div>
  </section>
)}

       <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-white">
            Create Company
          </h2>

          <form onSubmit={handleCreateCompany} className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Company Name *
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  placeholder="Example: HorizenOne"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Company Code *
                </span>
                <input
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  placeholder="Example: horizenone"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Contact Name
                </span>
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  placeholder="Primary contact"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Contact Email
                </span>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  placeholder="contact@example.com"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Contact Phone
                </span>
                <input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  placeholder="555-555-5555"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Address
                </span>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  placeholder="Street address"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  City
                </span>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  placeholder="City"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    State
                  </span>
                  <input
                    value={stateValue}
                    onChange={(e) => setStateValue(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    placeholder="MD"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    ZIP
                  </span>
                  <input
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    placeholder="21157"
                  />
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Create Company"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Company Profiles
            </h2>

            <button
              onClick={loadCompanies}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-blue-500"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-slate-500">Loading companies...</p>
          ) : companies.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No companies have been created yet.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800 text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">
                          {company.name || "Unnamed Company"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {company.city || ""}
                          {company.city && company.state ? ", " : ""}
                          {company.state || ""}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {company.companyCode || "—"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        <div>{company.contactName || "—"}</div>
                        <div className="text-xs text-slate-500">
                          {company.contactEmail || ""}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            company.isActive
                              ? "bg-cyan-900 text-cyan-300"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {company.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openEditCompany(company)}
                            className="rounded-lg border border-cyan-700 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-slate-800"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => toggleCompanyStatus(company)}
                            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                          >
                           {company.isActive ? "Deactivate" : "Activate"}
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