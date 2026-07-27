"use client";

import AppShell from "@/components/AppShell";
import { CustomerForm } from "@/features/customers/components/CustomerForm";
import { DuplicateCustomerWarning } from "@/features/customers/components/DuplicateCustomerWarning";
import { useCreateCustomer } from "@/features/customers/hooks/useCreateCustomer";
import type { DuplicateCustomerMatch } from "@/features/customers/types/customerDuplicate";
import type { CustomerFormValues } from "@/features/customers/types/customerForm";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewCustomerPage() {
  const router = useRouter();

  const {
    createCustomer,
    isLoading,
    isSaving,
    canSubmit,
    error,
  } = useCreateCustomer();

  const [duplicates, setDuplicates] = useState<
    DuplicateCustomerMatch[]
  >([]);

  const [pendingValues, setPendingValues] =
    useState<CustomerFormValues | null>(null);

  async function createAndRedirect(
    values: CustomerFormValues,
    allowDuplicate: boolean
  ) {
    const result = await createCustomer(values, {
      allowDuplicate,
    });

    if (result.status === "duplicates") {
      setPendingValues(values);
      setDuplicates(result.duplicates);
      return;
    }

    if (result.status !== "success") {
      return;
    }

    setPendingValues(null);
    setDuplicates([]);

    router.push(`/customers/${result.customerId}`);
    router.refresh();
  }

  async function handleSubmit(
    values: CustomerFormValues
  ) {
    setPendingValues(null);
    setDuplicates([]);

    await createAndRedirect(values, false);
  }

  async function handleCreateAnyway() {
    if (!pendingValues) {
      return;
    }

    await createAndRedirect(pendingValues, true);
  }

  function handleReviewCustomer() {
    setPendingValues(null);
    setDuplicates([]);
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mb-8">
          <Link
            href="/customers"
            className="text-sm text-slate-400 transition hover:text-white"
          >
            ← Back to Customers
          </Link>

          <h1 className="mt-4 text-3xl font-bold">
            New Customer
          </h1>

          <p className="mt-2 text-slate-400">
            Add a company-owned customer record before
            creating work orders.
          </p>
        </div>

        {duplicates.length > 0 && (
          <DuplicateCustomerWarning
            duplicates={duplicates}
            isSubmitting={isSaving}
            onCancel={handleReviewCustomer}
            onCreateAnyway={() => {
              void handleCreateAnyway();
            }}
          />
        )}

        <CustomerForm
          submitLabel="Save Customer"
          cancelHref="/customers"
          isSubmitting={isSaving}
          isDisabled={
            isLoading ||
            !canSubmit ||
            duplicates.length > 0
          }
          error={error}
          onSubmit={handleSubmit}
        />
      </div>
    </AppShell>
  );
}