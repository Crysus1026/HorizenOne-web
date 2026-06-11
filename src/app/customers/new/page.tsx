"use client";

import AppShell from "@/components/AppShell";
import Link from "next/link";
import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function NewCustomerPage() {
  const [customerName, setCustomerName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("MD");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  setIsSaving(true);
  setError("");

  try {
    await addDoc(collection(db, "customers"), {
      companyId: "horizenone-demo",
      customerName,
      accountNumber: accountNumber.trim(),
      address,
      city,
      state: stateValue,
      zip,
      phone,
      email,
      notes,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    router.push("/customers");
  } catch (err) {
    console.error(err);
    setError("Unable to save customer. Please try again.");
  } finally {
    setIsSaving(false);
  }
}

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-8">
          <Link
            href="/customers"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back to Customers
          </Link>

          <h1 className="mt-4 text-3xl font-bold">New Customer</h1>
          <p className="mt-2 text-slate-400">
            Add a customer record before creating work orders.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-w-3xl rounded-xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                placeholder="Customer account number"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                State
              </label>
              <input
                type="text"
                value={stateValue}
                onChange={(e) => setStateValue(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">Zip</label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2 min-h-32 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>
          </div>

          {error && (
              <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
              </div>
           )}

          <div className="mt-8 flex justify-end gap-3">
            <Link
              href="/customers"
              className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Link>

            

            <button
               type="submit"
               disabled={isSaving}
               className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
             >
               {isSaving ? "Saving..." : "Save Customer"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}