"use client";

import Link from "next/link";
import { useState } from "react";

import {
  EMPTY_CUSTOMER_FORM,
  normalizeCustomerFormValues,
  type CustomerFormValues,
} from "../types/customerForm";

type CustomerFormProps = {
  initialValues?: CustomerFormValues;
  submitLabel: string;
  cancelHref: string;
  isSubmitting: boolean;
  error?: string;
  isDisabled?: boolean;
  showActiveField?: boolean;
  onSubmit: (
    values: CustomerFormValues
  ) => Promise<void> | void;
};

export function CustomerForm({
  initialValues = EMPTY_CUSTOMER_FORM,
  submitLabel,
  cancelHref,
  isSubmitting,
  error = "",
  isDisabled = false,
  showActiveField = false,
  onSubmit,
}: CustomerFormProps) {
  const [values, setValues] =
    useState<CustomerFormValues>(initialValues);

  const [validationError, setValidationError] =
    useState("");

  function updateField<K extends keyof CustomerFormValues>(
    field: K,
    value: CustomerFormValues[K]
  ) {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));

    if (validationError) {
      setValidationError("");
    }
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalizedValues =
      normalizeCustomerFormValues(values);

    if (!normalizedValues.customerName) {
      setValidationError("Customer name is required.");
      return;
    }

    if (!normalizedValues.address) {
      setValidationError("Address is required.");
      return;
    }

    if (!normalizedValues.city) {
      setValidationError("City is required.");
      return;
    }

    if (!normalizedValues.state) {
      setValidationError("State is required.");
      return;
    }

    if (!normalizedValues.zip) {
      setValidationError("ZIP code is required.");
      return;
    }

    setValidationError("");

    await onSubmit(normalizedValues);
  }

  const displayedError = validationError || error;
  const formDisabled = isSubmitting || isDisabled;

  return (
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
            value={values.customerName}
            onChange={(event) =>
              updateField("customerName", event.target.value)
            }
            disabled={formDisabled}
            autoComplete="name"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="accountNumber"
            className="text-sm font-medium text-slate-300"
          >
            Account Number
            <span className="ml-2 text-xs font-normal text-slate-500">
              Optional
            </span>
          </label>

          <input
            id="accountNumber"
            type="text"
            value={values.accountNumber}
            onChange={(event) =>
              updateField("accountNumber", event.target.value)
            }
            disabled={formDisabled}
            placeholder="Customer account number"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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
            value={values.address}
            onChange={(event) =>
              updateField("address", event.target.value)
            }
            disabled={formDisabled}
            autoComplete="street-address"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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
            value={values.city}
            onChange={(event) =>
              updateField("city", event.target.value)
            }
            disabled={formDisabled}
            autoComplete="address-level2"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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
            value={values.state}
            onChange={(event) =>
              updateField(
                "state",
                event.target.value.toUpperCase()
              )
            }
            disabled={formDisabled}
            autoComplete="address-level1"
            maxLength={2}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 uppercase text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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
            value={values.zip}
            onChange={(event) =>
              updateField("zip", event.target.value)
            }
            disabled={formDisabled}
            autoComplete="postal-code"
            inputMode="numeric"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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
            value={values.phone}
            onChange={(event) =>
              updateField("phone", event.target.value)
            }
            disabled={formDisabled}
            autoComplete="tel"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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
            value={values.email}
            onChange={(event) =>
              updateField("email", event.target.value)
            }
            disabled={formDisabled}
            autoComplete="email"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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
            value={values.notes}
            onChange={(event) =>
              updateField("notes", event.target.value)
            }
            disabled={formDisabled}
            className="mt-2 min-h-32 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        {showActiveField && (
          <div className="md:col-span-2">
            <label className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-950 p-4">
              <input
                type="checkbox"
                checked={values.isActive}
                onChange={(event) =>
                  updateField(
                    "isActive",
                    event.target.checked
                  )
                }
                disabled={formDisabled}
                className="h-4 w-4 disabled:cursor-not-allowed"
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
        )}
      </div>

      {displayedError && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {displayedError}
        </div>
      )}

      <div className="mt-8 flex justify-end gap-3">
        <Link
          href={cancelHref}
          className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300 transition hover:bg-slate-800"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={formDisabled}
          className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}