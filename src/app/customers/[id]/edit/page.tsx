"use client";

import AppShell from "@/components/AppShell";
import { useUserProfile } from "@/hooks/useUserProfile";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CustomerRecord = {
  companyId?: string;
  customerName?: string;
  name?: string;
  accountNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  notes?: string;
  isActive?: boolean;
};

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();

  const customerId =
    typeof params.id === "string" ? params.id : "";

  const {
    companyId,
    isSystemAdmin,
    isLoadingProfile,
    profileError,
  } = useUserProfile();

  const [customerCompanyId, setCustomerCompanyId] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("MD");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [isLoadingCustomer, setIsLoadingCustomer] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoadingProfile) return;

    if (profileError) {
      setError(profileError);
      setIsLoadingCustomer(false);
      return;
    }

    if (!customerId) {
      setError("Customer ID is missing.");
      setIsLoadingCustomer(false);
      return;
    }

    if (!isSystemAdmin && !companyId) {
      setError("Your user account is missing a company assignment.");
      setIsLoadingCustomer(false);
      return;
    }

    async function loadCustomer() {
      try {
        setIsLoadingCustomer(true);
        setError("");

        const customerRef = doc(db, "customers", customerId);
        const customerSnap = await getDoc(customerRef);

        if (!customerSnap.exists()) {
          setError("Customer not found.");
          return;
        }

        const customer = customerSnap.data() as CustomerRecord;

        if (
          !isSystemAdmin &&
          customer.companyId !== companyId
        ) {
          setError(
            "You do not have permission to edit this customer."
          );
          return;
        }

        setCustomerCompanyId(customer.companyId || "");
        setCustomerName(
          customer.customerName || customer.name || ""
        );
        setAccountNumber(customer.accountNumber || "");
        setAddress(customer.address || "");
        setCity(customer.city || "");
        setStateValue(customer.state || "MD");
        setZip(customer.zip || "");
        setPhone(customer.phone || "");
        setEmail(customer.email || "");
        setNotes(customer.notes || "");
        setIsActive(customer.isActive !== false);
      } catch (err: unknown) {
        console.error("Load customer error:", err);

        const message =
          err instanceof Error
            ? err.message
            : "Unable to load customer.";

        setError(message);
      } finally {
        setIsLoadingCustomer(false);
      }
    }

    void loadCustomer();
  }, [
    customerId,
    companyId,
    isSystemAdmin,
    isLoadingProfile,
    profileError,
  ]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!customerId) {
      setError("Customer ID is missing.");
      return;
    }

    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }

    if (!accountNumber.trim()) {
      setError("Account number is required.");
      return;
    }

    if (!address.trim()) {
      setError("Address is required.");
      return;
    }

    if (!city.trim()) {
      setError("City is required.");
      return;
    }

    if (!stateValue.trim()) {
      setError("State is required.");
      return;
    }

    if (!zip.trim()) {
      setError("ZIP code is required.");
      return;
    }

    if (!customerCompanyId) {
      setError("This customer is missing a company assignment.");
      return;
    }

    if (
      !isSystemAdmin &&
      customerCompanyId !== companyId
    ) {
      setError(
        "You do not have permission to edit this customer."
      );
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      const customerRef = doc(db, "customers", customerId);

      await updateDoc(customerRef, {
        customerName: customerName.trim(),
        accountNumber: accountNumber.trim(),
        address: address.trim(),
        city: city.trim(),
        state: stateValue.trim().toUpperCase(),
        zip: zip.trim(),
        phone: phone.trim(),
        email: email.trim(),
        notes: notes.trim(),
        isActive,
        companyId: customerCompanyId,
        updatedAt: serverTimestamp(),
      });

      router.push(`/customers/${customerId}`);
      router.refresh();
    } catch (err: unknown) {
      console.error("Update customer error:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Unable to update customer.";

      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  const isLoading = isLoadingProfile || isLoadingCustomer;

  if (isLoading) {
    return (
      <AppShell>
        <div className="min-h-screen bg-slate-950 p-8 text-white">
          Loading customer...
        </div>
      </AppShell>
    );
  }

  if (error && !customerCompanyId) {
    return (
      <AppShell>
        <div className="min-h-screen bg-slate-950 p-8 text-white">
          <div className="max-w-3xl">
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>

            <Link
              href="/customers"
              className="mt-6 inline-block text-blue-400 hover:text-blue-300"
            >
              ← Back to Customers
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mb-8">
          <Link
            href={`/customers/${customerId}`}
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back to Customer
          </Link>

          <h1 className="mt-4 text-3xl font-bold">
            Edit Customer
          </h1>

          <p className="mt-2 text-slate-400">
            Update customer contact details, service address, and
            account status.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-w-3xl rounded-xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="customerName"
                className="text-sm font-medium text-slate-300"
              >
                Customer Name
              </label>

              <input
                id="customerName"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="accountNumber"
                className="text-sm font-medium text-slate-300"
              >
                Account Number
              </label>

              <input
                id="accountNumber"
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="address"
                className="text-sm font-medium text-slate-300"
              >
                Address
              </label>

              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
              />
            </div>

            <div>
              <label
                htmlFor="city"
                className="text-sm font-medium text-slate-300"
              >
                City
              </label>

              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
              />
            </div>

            <div>
              <label
                htmlFor="state"
                className="text-sm font-medium text-slate-300"
              >
                State
              </label>

              <input
                id="state"
                type="text"
                value={stateValue}
                onChange={(e) => setStateValue(e.target.value)}
                maxLength={2}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 uppercase text-white"
                required
              />
            </div>

            <div>
              <label
                htmlFor="zip"
                className="text-sm font-medium text-slate-300"
              >
                ZIP
              </label>

              <input
                id="zip"
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="text-sm font-medium text-slate-300"
              >
                Phone
              </label>

              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-slate-300"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="notes"
                className="text-sm font-medium text-slate-300"
              >
                Notes
              </label>

              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2 min-h-32 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-950 p-4">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4"
                />

                <span>
                  <span className="block text-sm font-medium text-white">
                    Active Customer
                  </span>

                  <span className="mt-1 block text-xs text-slate-400">
                    Inactive customers remain in the database but can
                    be excluded from active customer lists.
                  </span>
                </span>
              </label>
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="mt-8 flex justify-end gap-3">
            <Link
              href={`/customers/${customerId}`}
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