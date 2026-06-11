"use client";

import AppShell from "@/components/AppShell";
import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Customer = {
  id: string;
  customerName: string;
  accountNumber?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  notes: string;
  isActive: boolean;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const customersQuery = query(
          collection(db, "customers"),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(customersQuery);

        const customerData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Customer[];

        setCustomers(customerData);
      } catch (error) {
        console.error("Error loading customers:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadCustomers();
  }, []);

  const filteredCustomers = customers.filter((customer) => {
    const search = searchTerm.toLowerCase();

    return (
      customer.customerName?.toLowerCase().includes(search) ||
      customer.address?.toLowerCase().includes(search) ||
      customer.city?.toLowerCase().includes(search) ||
      customer.phone?.toLowerCase().includes(search) ||
      customer.email?.toLowerCase().includes(search)
    );
  });

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Customers</h1>
            <p className="mt-2 text-slate-400">
              Manage customer records, contact details, and service locations.
            </p>
          </div>

          <Link
            href="/customers/new"
            className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-400"
          >
            + New Customer
          </Link>
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-4">
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500"
            />
          </div>

          {isLoading ? (
            <div className="p-6 text-slate-400">Loading customers...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-6 text-slate-400">No customers found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Account #</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Address</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">State</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-b border-slate-800 last:border-b-0"
                    >
                      <td className="px-4 py-4 font-medium text-white">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="text-white hover:text-blue-400"
                        >
                          {customer.customerName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {customer.accountNumber || "—"}
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {customer.phone || "—"}
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {customer.email || "—"}
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {customer.address}
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {customer.city}
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {customer.state}
                      </td>
                      <td className="px-4 py-4">
                        {customer.isActive ? (
                          <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-500/10 px-3 py-1 text-xs font-medium text-slate-400">
                            Archived
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}