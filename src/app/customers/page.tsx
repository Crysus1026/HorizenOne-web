"use client";

import AppShell from "@/components/AppShell";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

const SEARCH_DEBOUNCE_MS = 350;

export default function CustomersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] =
    useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  const {
    customers,
    isLoading,
    error,
    currentPage,
    hasNextPage,
    hasPreviousPage,
    isSearching,
    nextPage,
    previousPage,
  } = useCustomers(debouncedSearchTerm);

  const isWaitingForDebounce =
    searchInput.trim() !== debouncedSearchTerm;

  const isSearchLoading =
    searchInput.trim().length > 0 &&
    (isWaitingForDebounce || isLoading);

  const showInitialLoading =
    isLoading &&
    !isSearching &&
    customers.length === 0;

  return (
    <AppShell>
      <div className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Customers
            </h1>

            <p className="mt-2 text-slate-400">
              Manage customer records, contact details,
              and service locations.
            </p>
          </div>

          <Link
            href="/customers/new"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white transition hover:bg-blue-400"
          >
            + New Customer
          </Link>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <section className="mt-8 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-4">
            <label
              htmlFor="customer-search"
              className="text-sm font-medium text-slate-300"
            >
              Search customers
            </label>

            <input
              id="customer-search"
              type="search"
              value={searchInput}
              onChange={(event) =>
                setSearchInput(event.target.value)
              }
              placeholder="Search by name, account number, address, phone, or email..."
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />

            <div className="mt-2 flex min-h-5 items-center justify-between gap-4">
              <p className="text-xs text-slate-500">
                {isSearching
                  ? `Searching all customers in your authorized company scope.`
                  : "Showing 10 customers per page, newest first."}
              </p>

              {isSearchLoading && (
                <p className="text-xs text-slate-400">
                  Searching...
                </p>
              )}
            </div>
          </div>

          {showInitialLoading ? (
            <div className="p-6 text-slate-400">
              Loading customers...
            </div>
          ) : isSearchLoading &&
            customers.length === 0 ? (
            <div className="p-6 text-slate-400">
              Searching customers...
            </div>
          ) : customers.length === 0 ? (
            <div className="p-6 text-slate-400">
              {isSearching
                ? "No customers match your search."
                : "No customers found."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      Customer
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      Account #
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      Phone
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      Email
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      Address
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      City
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      State
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-b border-slate-800 transition last:border-b-0 hover:bg-slate-800/40"
                    >
                      <td className="whitespace-nowrap px-4 py-4 font-medium">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="text-white transition hover:text-blue-400"
                        >
                          {customer.customerName}
                        </Link>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-slate-300">
                        {customer.accountNumber || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-slate-300">
                        {customer.phone || "—"}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {customer.email || "—"}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {customer.address || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-slate-300">
                        {customer.city || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-slate-300">
                        {customer.state || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        {customer.isActive ? (
                          <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-500/10 px-3 py-1 text-xs font-medium text-slate-400">
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isSearching && (
            <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
              <p className="text-sm text-slate-400">
                Page {currentPage}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={previousPage}
                  disabled={
                    !hasPreviousPage || isLoading
                  }
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() => void nextPage()}
                  disabled={!hasNextPage || isLoading}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isLoading
                    ? "Loading..."
                    : "Next"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}