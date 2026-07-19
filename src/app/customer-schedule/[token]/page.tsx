"use client";

import { db, storage } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import jsPDF from "jspdf";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const timeWindows = [
  "8:00 AM - 10:00 AM",
  "10:00 AM - 12:00 PM",
  "12:00 PM - 2:00 PM",
  "2:00 PM - 4:00 PM",
];

type WorkOrder = {
  id: string;
  customerName?: string;
  address?: string;
  customerAddress?: string;
  serviceTypeName?: string;
  scheduledDate?: string;
  timeWindow?: string;
  companyId?: string;
  projectId?: string;
  projectName?: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  status?: string;

  customerScheduleTokenUsed?: boolean;
  customerAcceptedTerms?: boolean;
  customerAcceptedWaiver?: boolean;
  customerAcceptedAt?: Timestamp | Date;
  customerScheduledAt?: Timestamp | Date;

  customerSignatureName?: string;
  customerSignatureConfirmed?: boolean;
  customerSignedAt?: Timestamp | Date;

  customerConfirmationNumber?: string;
  customerConfirmationReceiptUrl?: string;

  scheduledBy?: string;
};

type ReceiptResult = {
  confirmationNumber: string;
  receiptUrl: string;
  signedAt: Date;
};

function formatTimestamp(value?: Timestamp | Date) {
  if (!value) {
    return "Not available";
  }

  const date = value instanceof Date ? value : value.toDate();

  return date.toLocaleString();
}

function formatInstallationDate(value?: string) {
  if (!value) {
    return "Not selected";
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function CustomerSchedulePage() {
  const params = useParams();
  const token = params.token as string;

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedWindow, setSelectedWindow] = useState("");

  const [availableWindows, setAvailableWindows] = useState<string[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] =
    useState(false);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedWaiver, setAcceptedWaiver] = useState(false);

  const [signatureName, setSignatureName] = useState("");
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
  async function loadWorkOrder() {
    try {
      const workOrderQuery = query(
        collection(db, "workOrders"),
        where("customerScheduleToken", "==", token)
      );

      const snapshot = await getDocs(workOrderQuery);

      if (snapshot.empty) {
        setError("This customer confirmation link is invalid.");
        return;
      }

      const documentSnapshot = snapshot.docs[0];
      const data = documentSnapshot.data();

      setWorkOrder({
        id: documentSnapshot.id,
        ...data,
      } as WorkOrder);

      setSelectedDate(data.scheduledDate || "");
      setSelectedWindow(data.timeWindow || "");
    } catch (loadError) {
      console.error(
        "Unable to load customer confirmation:",
        loadError
      );

      setError(
        "Unable to load the customer confirmation page."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (token) {
    loadWorkOrder();
  }
}, [token]);

useEffect(() => {
  async function loadAvailability() {
    if (
      !token ||
      !selectedDate ||
      workOrder?.customerScheduleTokenUsed
    ) {
      setAvailableWindows([]);
      return;
    }

    try {
      setIsLoadingAvailability(true);
      setError("");

      const response = await fetch(
        `/api/customer-schedule/availability?token=${encodeURIComponent(
          token
        )}&date=${encodeURIComponent(selectedDate)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to load available time windows."
        );
      }

      const loadedWindows = Array.isArray(
        result.availableWindows
      )
        ? result.availableWindows
        : [];

      setAvailableWindows(loadedWindows);

      if (
        selectedWindow &&
        !loadedWindows.includes(selectedWindow)
      ) {
        setSelectedWindow("");
      }
    } catch (availabilityError) {
      console.error(
        "Unable to load scheduling availability:",
        availabilityError
      );

      setAvailableWindows([]);

      setError(
        availabilityError instanceof Error
          ? availabilityError.message
          : "Unable to load available time windows."
      );
    } finally {
      setIsLoadingAvailability(false);
    }
  }

  loadAvailability();
}, [
  token,
  selectedDate,
  selectedWindow,
  workOrder?.customerScheduleTokenUsed,
]);

  async function generateAndUploadReceipt(): Promise<ReceiptResult> {
    if (!workOrder) {
      throw new Error("Work order not loaded.");
    }

    const confirmationNumber = `HO-${Date.now()}`;
    const signedAt = new Date();

    const customerAddress =
      workOrder.address ||
      workOrder.customerAddress ||
      "Not provided";

    const pdf = new jsPDF();

    pdf.setFontSize(18);
    pdf.text("Customer Confirmation Receipt", 20, 20);

    pdf.setFontSize(11);
    pdf.text(`Confirmation Number: ${confirmationNumber}`, 20, 35);
    pdf.text(
      `Customer: ${workOrder.customerName || "Not provided"}`,
      20,
      45
    );
    pdf.text(`Address: ${customerAddress}`, 20, 55);
    pdf.text(
      `Service: ${workOrder.serviceTypeName || "Installation"}`,
      20,
      65
    );
    pdf.text(
      `Installation Date: ${formatInstallationDate(selectedDate)}`,
      20,
      75
    );
    pdf.text(`Time Window: ${selectedWindow}`, 20, 85);

    pdf.setFontSize(13);
    pdf.text("Customer Acknowledgments", 20, 105);

    pdf.setFontSize(11);
    pdf.text("Terms & Conditions Accepted: Yes", 20, 115);
    pdf.text("Waiver Accepted: Yes", 20, 125);

    pdf.setFontSize(13);
    pdf.text("Electronic Signature", 20, 145);

    pdf.setFontSize(11);
    pdf.text(`Typed Name: ${signatureName.trim()}`, 20, 155);
    pdf.text(`Signed At: ${signedAt.toLocaleString()}`, 20, 165);

    pdf.setFontSize(13);
    pdf.text("Document References", 20, 185);

    pdf.setFontSize(11);
    pdf.text(
      "Terms & Conditions: /documents/terms-and-conditions.pdf",
      20,
      195
    );
    pdf.text("Waiver: /documents/waiver.pdf", 20, 205);

    const pdfBlob = pdf.output("blob");

    const receiptReference = ref(
      storage,
      `customer-confirmation-receipts/${workOrder.id}.pdf`
    );

    await uploadBytes(receiptReference, pdfBlob, {
      contentType: "application/pdf",
    });

    const receiptUrl = await getDownloadURL(receiptReference);

    return {
      confirmationNumber,
      receiptUrl,
      signedAt,
    };
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!workOrder) {
      return;
    }

    if (workOrder.customerScheduleTokenUsed) {
      setError("This customer confirmation has already been completed.");
      return;
    }

    if (!acceptedTerms || !acceptedWaiver) {
      setError(
        "You must agree to both the Terms & Conditions and the Waiver."
      );
      return;
    }

    if (!signatureName.trim() || !signatureConfirmed) {
      setError(
        "You must enter your full name and confirm your electronic signature."
      );
      return;
    }

    if (!selectedDate || !selectedWindow) {
      setError("Please select a date and time window.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const receipt = await generateAndUploadReceipt();

      await updateDoc(doc(db, "workOrders", workOrder.id), {
        scheduledDate: selectedDate,
        timeWindow: selectedWindow,
        status: "Scheduled",

        customerAcceptedTerms: true,
        customerAcceptedWaiver: true,
        customerAcceptedAt: serverTimestamp(),

        customerScheduledAt: serverTimestamp(),

        customerSignatureName: signatureName.trim(),
        customerSignatureConfirmed: true,
        customerSignedAt: serverTimestamp(),

        customerScheduleTokenUsed: true,

        customerConfirmationNumber: receipt.confirmationNumber,
        customerConfirmationReceiptUrl: receipt.receiptUrl,

        scheduledBy: "customer",
        updatedAt: serverTimestamp(),
      });

      setWorkOrder((currentWorkOrder) => {
        if (!currentWorkOrder) {
          return currentWorkOrder;
        }

        return {
          ...currentWorkOrder,
          scheduledDate: selectedDate,
          timeWindow: selectedWindow,
          customerAcceptedTerms: true,
          customerAcceptedWaiver: true,
          customerAcceptedAt: receipt.signedAt,
          customerScheduledAt: receipt.signedAt,
          customerSignatureName: signatureName.trim(),
          customerSignatureConfirmed: true,
          customerSignedAt: receipt.signedAt,
          customerScheduleTokenUsed: true,
          customerConfirmationNumber: receipt.confirmationNumber,
          customerConfirmationReceiptUrl: receipt.receiptUrl,
          scheduledBy: "customer",
        };
      });
    } catch (submitError: unknown) {
      console.error("Unable to confirm installation:", submitError);

      if (submitError instanceof Error) {
        setError(`Unable to confirm installation: ${submitError.message}`);
      } else {
        setError("Unable to confirm installation due to an unknown error.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            Loading customer confirmation...
          </div>
        </div>
      </main>
    );
  }

  if (error && !workOrder) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-2xl rounded-xl border border-red-500/40 bg-red-950/30 p-6">
          <h1 className="text-xl font-semibold">
            Customer Confirmation Unavailable
          </h1>

          <p className="mt-2 text-red-100">{error}</p>
        </div>
      </main>
    );
  }

  if (workOrder?.customerScheduleTokenUsed) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-3xl">
          <section className="rounded-xl border border-green-500/40 bg-green-950/20 p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <h1 className="text-3xl font-bold">
                  Appointment Confirmed
                </h1>

                <p className="mt-2 text-slate-300">
                  This customer confirmation has been completed. The details
                  below are read-only and cannot be changed through this link.
                </p>
              </div>

              <span className="w-fit rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300">
                Confirmed
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Customer
                </p>
                <p className="mt-1 text-white">
                  {workOrder.customerName || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Address
                </p>
                <p className="mt-1 text-white">
                  {workOrder.address ||
                    workOrder.customerAddress ||
                    "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Service
                </p>
                <p className="mt-1 text-white">
                  {workOrder.serviceTypeName || "Installation"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Scheduled By
                </p>
                <p className="mt-1 text-white">
                  {workOrder.scheduledBy === "customer"
                    ? "Customer"
                    : "Not available"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Installation Date
                </p>
                <p className="mt-1 text-white">
                  {formatInstallationDate(workOrder.scheduledDate)}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Time Window
                </p>
                <p className="mt-1 text-white">
                  {workOrder.timeWindow || "Not selected"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Terms & Conditions
                </p>
                <p className="mt-1 text-white">
                  {workOrder.customerAcceptedTerms
                    ? "Accepted"
                    : "Not accepted"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Waiver
                </p>
                <p className="mt-1 text-white">
                  {workOrder.customerAcceptedWaiver
                    ? "Accepted"
                    : "Not accepted"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Electronic Signature
                </p>
                <p className="mt-1 text-white">
                  {workOrder.customerSignatureName || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Signed
                </p>
                <p className="mt-1 text-white">
                  {formatTimestamp(workOrder.customerSignedAt)}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Confirmation Number
                </p>
                <p className="mt-1 text-white">
                  {workOrder.customerConfirmationNumber || "Not available"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/documents/terms-and-conditions.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                View Terms & Conditions
              </a>

              <a
                href="/documents/waiver.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                View Waiver
              </a>

              {workOrder.customerConfirmationReceiptUrl && (
                <a
                  href={workOrder.customerConfirmationReceiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  View Confirmation Receipt
                </a>
              )}
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">
          Confirm Your Smart Thermostat Upgrade
        </h1>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-semibold">
            Installation Details
          </h2>

          <p className="mt-2 text-slate-300">
            Customer: {workOrder?.customerName || "Customer"}
          </p>

          <p className="text-slate-300">
            Address:{" "}
            {workOrder?.address ||
              workOrder?.customerAddress ||
              "Not listed"}
          </p>

          <p className="text-slate-300">
            Service: {workOrder?.serviceTypeName || "Installation"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-semibold">
              Terms & Conditions
            </h2>

            <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950 p-4">
              <p className="text-sm text-slate-300">
                Please review the Terms & Conditions before continuing.
              </p>

              <a
                href="/documents/terms-and-conditions.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
              >
                View Terms & Conditions
              </a>
            </div>

            <label className="mt-4 flex items-start gap-3">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) =>
                  setAcceptedTerms(event.target.checked)
                }
                className="mt-1"
              />

              <span className="text-sm text-slate-300">
                I have read and agree to the Terms & Conditions.
              </span>
            </label>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-semibold">Waiver</h2>

            <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950 p-4">
              <p className="text-sm text-slate-300">
                Please review the waiver before continuing.
              </p>

              <a
                href="/documents/waiver.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
              >
                View Waiver
              </a>
            </div>

            <label className="mt-4 flex items-start gap-3">
              <input
                type="checkbox"
                checked={acceptedWaiver}
                onChange={(event) =>
                  setAcceptedWaiver(event.target.checked)
                }
                className="mt-1"
              />

              <span className="text-sm text-slate-300">
                I have read and agree to the Waiver.
              </span>
            </label>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-semibold">
              Electronic Signature
            </h2>

            <p className="mt-2 text-sm text-slate-300">
              By typing your full name below, you acknowledge that this
              serves as your electronic signature.
            </p>

            <label className="mt-4 block">
              <span className="text-sm text-slate-300">
                Full Name
              </span>

              <input
                type="text"
                value={signatureName}
                onChange={(event) =>
                  setSignatureName(event.target.value)
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                placeholder="Enter your full name"
                autoComplete="name"
              />
            </label>

            <label className="mt-4 flex items-start gap-3">
              <input
                type="checkbox"
                checked={signatureConfirmed}
                onChange={(event) =>
                  setSignatureConfirmed(event.target.checked)
                }
                className="mt-1"
              />

              <span className="text-sm text-slate-300">
                I certify that typing my name above constitutes my
                electronic signature.
              </span>
            </label>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-semibold">
              Select Date & Time
            </h2>

            <label className="mt-4 block">
              <span className="text-sm text-slate-300">
                Installation Date
              </span>

              <input
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setSelectedWindow("");
                  setAvailableWindows([]);
                }}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm text-slate-300">
                Time Window
              </span>

              <select
                value={selectedWindow}
                onChange={(event) =>
                  setSelectedWindow(event.target.value)
                }
                disabled={
                  !selectedDate ||
                  isLoadingAvailability ||
                  availableWindows.length === 0
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {!selectedDate
                    ? "Select a date first"
                    : isLoadingAvailability
                    ? "Checking availability..."
                    : availableWindows.length === 0
                    ? "No appointments available"
                    : "Select a time window"}
                </option>

                {availableWindows.map((window) => (
                  <option key={window} value={window}>
                    {window}
                  </option>
                ))}
              </select>
            </label>
          </section>

          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={
              isSubmitting ||
              isLoadingAvailability ||
              !selectedDate ||
              !selectedWindow
            }
            className="w-full rounded-lg bg-cyan-500 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Confirming Installation..."
              : "Confirm Installation"}
          </button>
        </form>
      </div>
    </main>
  );
}