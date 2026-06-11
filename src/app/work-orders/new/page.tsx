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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Customer = {
  id: string;
  customerName: string;
  isActive: boolean;
};

type ServiceType = {
  id: string;
  name: string;
  durationMinutes: number;
  isActive: boolean;
};

export default function NewWorkOrderPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [timeWindow, setTimeWindow] = useState("");
  const [notes, setNotes] = useState("");

  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOptions() {
      try {
        const customersQuery = query(
          collection(db, "customers"),
          where("isActive", "==", true),
          orderBy("customerName", "asc")
        );

        const serviceTypesQuery = query(
          collection(db, "serviceTypes"),
          where("isActive", "==", true),
          orderBy("name", "asc")
        );

        const [customersSnapshot, serviceTypesSnapshot] = await Promise.all([
          getDocs(customersQuery),
          getDocs(serviceTypesQuery),
        ]);

        const customerData = customersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Customer[];

        const serviceTypeData = serviceTypesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ServiceType[];

        setCustomers(customerData);
        setServiceTypes(serviceTypeData);
      } catch (err) {
        console.error(err);
        setError("Unable to load customers or service types.");
      } finally {
        setIsLoadingOptions(false);
      }
    }

    loadOptions();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setIsSaving(true);
    setError("");

    const selectedCustomer = customers.find(
      (customer) => customer.id === customerId
    );

    const selectedServiceType = serviceTypes.find(
      (serviceType) => serviceType.id === serviceTypeId
    );

    if (!selectedCustomer || !selectedServiceType) {
      setError("Please select a customer and service type.");
      setIsSaving(false);
      return;
    }

    function generateWorkOrderNumber() {
      const date = new Date();
      const year = date.getFullYear();
      const random = Math.floor(1000 + Math.random() * 9000);

      return `WO-${year}-${random}`;
    }

    try {
      await addDoc(collection(db, "workOrders"), {
        workOrderNumber: generateWorkOrderNumber(),
        companyId: "horizenone-demo",

        customerId: selectedCustomer.id,
        customerName: selectedCustomer.customerName,

        serviceTypeId: selectedServiceType.id,
        serviceTypeName: selectedServiceType.name,
        serviceDurationMinutes: selectedServiceType.durationMinutes || 0,

        status: "Scheduled",

        scheduledDate,
        timeWindow,

        assignedTechnicianId: "",
        assignedTechnicianName: "",

        notes,
        isActive: true,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      router.push("/work-orders");
    } catch (err) {
      console.error(err);
      setError("Unable to save work order.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-8">
          <Link
            href="/work-orders"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back to Work Orders
          </Link>

          <h1 className="mt-4 text-3xl font-bold">New Work Order</h1>
          <p className="mt-2 text-slate-400">
            Create a scheduled work order for a customer.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-w-3xl rounded-xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Customer
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
                disabled={isLoadingOptions}
              >
                <option value="">
                  {isLoadingOptions ? "Loading customers..." : "Select customer"}
                </option>

                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customerName}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Service Type
              </label>
              <select
                value={serviceTypeId}
                onChange={(e) => setServiceTypeId(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
                disabled={isLoadingOptions}
              >
                <option value="">
                  {isLoadingOptions
                    ? "Loading service types..."
                    : "Select service type"}
                </option>

                {serviceTypes.map((serviceType) => (
                  <option key={serviceType.id} value={serviceType.id}>
                    {serviceType.name} — {serviceType.durationMinutes} min
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Scheduled Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Time Window
              </label>
              <select
                value={timeWindow}
                onChange={(e) => setTimeWindow(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                required
              >
                <option value="">Select time window</option>
                <option value="8:00 AM - 10:00 AM">8:00 AM - 10:00 AM</option>
                <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM</option>
                <option value="12:00 PM - 2:00 PM">12:00 PM - 2:00 PM</option>
                <option value="2:00 PM - 4:00 PM">2:00 PM - 4:00 PM</option>
                <option value="4:00 PM - 6:00 PM">4:00 PM - 6:00 PM</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-300">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add job notes, access instructions, or special requirements."
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
              href="/work-orders"
              className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSaving || isLoadingOptions}
              className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Work Order"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}