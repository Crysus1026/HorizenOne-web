import type {
  DuplicateCustomerMatch,
  DuplicateReason,
} from "../types/customerDuplicate";

type DuplicateCustomerWarningProps = {
  duplicates: DuplicateCustomerMatch[];
  isSubmitting: boolean;
  onCancel: () => void;
  onCreateAnyway: () => void;
};

function getReasonLabel(
  reason: DuplicateReason
): string {
  switch (reason) {
    case "account-number":
      return "Same account number";

    case "email":
      return "Same email address";

    case "phone":
      return "Same phone number";

    case "name-and-address":
      return "Same name and address";
  }
}

export function DuplicateCustomerWarning({
  duplicates,
  isSubmitting,
  onCancel,
  onCreateAnyway,
}: DuplicateCustomerWarningProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="duplicate-customer-title"
      className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-5"
    >
      <h2
        id="duplicate-customer-title"
        className="text-lg font-semibold text-amber-200"
      >
        Possible duplicate customer
      </h2>

      <p className="mt-2 text-sm text-amber-100/80">
        One or more existing customers may match this
        record. Review them before creating another
        customer.
      </p>

      <div className="mt-4 space-y-3">
        {duplicates.map(({ customer, reasons }) => (
          <div
            key={customer.id}
            className="rounded-lg border border-amber-500/20 bg-slate-950/40 p-4"
          >
            <p className="font-medium text-white">
              {customer.customerName ||
                "Unnamed customer"}
            </p>

            <p className="mt-1 text-sm text-slate-300">
              {customer.address || "No address"}
              {customer.city
                ? `, ${customer.city}`
                : ""}
              {customer.state
                ? `, ${customer.state}`
                : ""}
            </p>

            {customer.accountNumber && (
              <p className="mt-1 text-sm text-slate-400">
                Account: {customer.accountNumber}
              </p>
            )}

            <div className="mt-2 flex flex-wrap gap-2">
              {reasons.map((reason) => (
                <span
                  key={reason}
                  className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-200"
                >
                  {getReasonLabel(reason)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Review Customer
        </button>

        <button
          type="button"
          onClick={onCreateAnyway}
          disabled={isSubmitting}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "Creating..."
            : "Create Anyway"}
        </button>
      </div>
    </div>
  );
}