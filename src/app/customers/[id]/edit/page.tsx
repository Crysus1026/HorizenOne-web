"use client";

import AppShell from "@/components/AppShell";
import { CustomerForm } from "@/features/customers/components/CustomerForm";
import { DuplicateCustomerWarning } from "@/features/customers/components/DuplicateCustomerWarning";
import { useEditableCustomer } from "@/features/customers/hooks/useEditableCustomer";
import type { DuplicateCustomerMatch } from "@/features/customers/types/customerDuplicate";
import type { CustomerFormValues } from "@/features/customers/types/customerForm";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();

  const customerId =
    typeof params.id === "string" ? params.id : "";

  const {
    initialValues,
    isLoading,
    isSaving,
    error,
    updateCustomer,
  } = useEditableCustomer(customerId);

  const [duplicates, setDuplicates] = useState<
    DuplicateCustomerMatch[]
  >([]);

  const [pendingValues, setPendingValues] =
    useState<CustomerFormValues | null>(null);

  async function updateAndRedirect(
    values: CustomerFormValues,
    allowDuplicate: boolean
  ) {
    const result = await updateCustomer(values, {
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

    router.push(`/customers/${customerId}`);
    router.refresh();
  }

  async function handleSubmit(
    values: CustomerFormValues
  ) {
    setPendingValues(null);
    setDuplicates([]);

    await updateAndRedirect(values, false);
  }

  async function handleUpdateAnyway() {
    if (!pendingValues) {
      return;
    }

    await updateAndRedirect(pendingValues, true);
  }

  function handleContinueEditing() {
    setPendingValues(null);
    setDuplicates([]);
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="min-h-screen bg-slate-950 p-8 text-white">
          Loading customer...
        </div>
      </AppShell>
    );
  }

  if (!initialValues) {
    return (
      <AppShell>
        <div className="min-h-screen bg-slate-950 p-8 text-white">
          <div className="max-w-3xl">
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error || "Unable to load customer."}
            </div>

            <Link
              href="/customers"
              className="mt-6 inline-block text-blue-400 transition hover:text-blue-300"
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
            className="text-sm text-slate-400 transition hover:text-white"
          >
            ← Back to Customer
          </Link>

          <h1 className="mt-4 text-3xl font-bold">
            Edit Customer
          </h1>

          <p className="mt-2 text-slate-400">
            Update customer contact details, service
            address, and account status.
          </p>
        </div>

        {duplicates.length > 0 && (
          <DuplicateCustomerWarning
            duplicates={duplicates}
            isSubmitting={isSaving}
            onCancel={handleContinueEditing}
            onCreateAnyway={() => {
              void handleUpdateAnyway();
            }}
          />
        )}

        <CustomerForm
          initialValues={initialValues}
          submitLabel="Save Changes"
          cancelHref={`/customers/${customerId}`}
          error={error}
          isSubmitting={isSaving}
          isDisabled={
            isSaving || duplicates.length > 0
          }
          showActiveField
          onSubmit={handleSubmit}
        />
      </div>
    </AppShell>
  );
}