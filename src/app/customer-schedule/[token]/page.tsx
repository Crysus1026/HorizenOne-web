"use client";

import { db, storage } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
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
  customerScheduleTokenUsed?: boolean;
};

export default function CustomerSchedulePage() {
  const params = useParams();
  const token = params.token as string;

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedWindow, setSelectedWindow] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedWaiver, setAcceptedWaiver] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadWorkOrder() {
      try {
        const q = query(
          collection(db, "workOrders"),
          where("customerScheduleToken", "==", token)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError("This scheduling link is invalid or expired.");
          return;
        }

        const docSnap = snapshot.docs[0];

        const data = docSnap.data();

        if (data.customerScheduleTokenUsed === true) {
        setError("This scheduling link has already been used.");
        return;
}

        setWorkOrder({
          id: docSnap.id,
          ...docSnap.data(),
        } as WorkOrder);
      } catch (err) {
        console.error(err);
        setError("Unable to load scheduling page.");
      } finally {
        setIsLoading(false);
      }
    }

    if (token) {
      loadWorkOrder();
    }
  }, [token]);

  async function generateAndUploadReceipt() {
  if (!workOrder) {
    throw new Error("Work order not loaded.");
  }

  const confirmationNumber = `HO-${Date.now()}`;
  const signedAt = new Date().toLocaleString();

  const pdf = new jsPDF();

  pdf.setFontSize(18);
  pdf.text("Customer Confirmation Receipt", 20, 20);

  pdf.setFontSize(11);
  pdf.text(`Confirmation Number: ${confirmationNumber}`, 20, 35);
  pdf.text(`Customer: ${workOrder.customerName || "Not provided"}`, 20, 45);
  pdf.text(
    `Address: ${workOrder.address || workOrder.customerAddress || "Not provided"}`,
    20,
    55
  );
  pdf.text(`Service: ${workOrder.serviceTypeName || "Installation"}`, 20, 65);
  pdf.text(`Installation Date: ${selectedDate}`, 20, 75);
  pdf.text(`Time Window: ${selectedWindow}`, 20, 85);

  pdf.text("Customer Acknowledgments", 20, 105);
  pdf.text("Terms & Conditions Accepted: Yes", 20, 115);
  pdf.text("Waiver Accepted: Yes", 20, 125);

  pdf.text("Electronic Signature", 20, 145);
  pdf.text(`Typed Name: ${signatureName.trim()}`, 20, 155);
  pdf.text(`Signed At: ${signedAt}`, 20, 165);

  pdf.text("Document References", 20, 185);
  pdf.text("Terms & Conditions: /documents/terms-and-conditions.pdf", 20, 195);
  pdf.text("Waiver: /documents/waiver.pdf", 20, 205);

  const pdfBlob = pdf.output("blob");

  const receiptRef = ref(
    storage,
    `customer-confirmation-receipts/${workOrder.id}.pdf`
  );

  await uploadBytes(receiptRef, pdfBlob, {
    contentType: "application/pdf",
  });

  const receiptUrl = await getDownloadURL(receiptRef);

  return {
    confirmationNumber,
    receiptUrl,
  };
}

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!workOrder) return;

    if (!acceptedTerms || !acceptedWaiver) {
    setError(
        "You must agree to both the Terms & Conditions and the Waiver.");
    return;    
    }

    if (!signatureName.trim() || !signatureConfirmed) {
    setError("You must enter your full name and confirm your electronic signature.");
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
        scheduledBy: "customer",
        updatedAt: serverTimestamp(),
        customerConfirmationNumber: receipt.confirmationNumber,
        customerConfirmationReceiptUrl: receipt.receiptUrl,
      });

      setSuccessMessage("Your installation has been scheduled successfully.");
    } catch (err) {
      console.error(err);
      setError("Unable to schedule your installation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        Loading...
      </main>
    );
  }

  if (error && !workOrder) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-2xl rounded-xl border border-red-500/40 bg-red-950/30 p-6">
          {error}
        </div>
      </main>
    );
  }

  if (successMessage) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-2xl rounded-xl border border-green-500/40 bg-green-950/30 p-6">
          <h1 className="text-2xl font-bold">Installation Scheduled</h1>
          <p className="mt-2 text-slate-300">{successMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">Schedule Your Installation</h1>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-semibold">Installation Details</h2>
          <p className="mt-2 text-slate-300">
            Customer: {workOrder?.customerName || "Customer"}
          </p>
          <p className="text-slate-300">
            Address: {workOrder?.address || workOrder?.customerAddress || "Not listed"}
          </p>
          <p className="text-slate-300">
            Service: {workOrder?.serviceTypeName || "Installation"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-semibold">Terms & Conditions</h2>
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
          </section>

            <label className="mt-4 flex items-start gap-3">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1"
              />

              <span className="text-sm text-slate-300">
                I have read and agree to the Terms & Conditions.
              </span>
            </label>

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
          </section>

            <label className="mt-4 flex items-start gap-3">
            <input
                type="checkbox"
                checked={acceptedWaiver}
                onChange={(e) => setAcceptedWaiver(e.target.checked)}
                className="mt-1"
            />

            <span className="text-sm text-slate-300">
                I have read and agree to the Waiver.
            </span>
            </label>

            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="text-xl font-semibold">Electronic Signature</h2>

                <p className="mt-2 text-sm text-slate-300">
                    By typing your full name below, you acknowledge that this serves as your electronic signature.
                </p>

                <label className="mt-4 block">
                    <span className="text-sm text-slate-300">Full Name</span>
                    <input
                    type="text"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    placeholder="Enter your full name"
                    />
                </label>

                <label className="mt-4 flex items-start gap-3">
                    <input
                    type="checkbox"
                    checked={signatureConfirmed}
                    onChange={(e) => setSignatureConfirmed(e.target.checked)}
                    className="mt-1"
                    />
                    <span className="text-sm text-slate-300">
                    I certify that typing my name above constitutes my electronic signature.
                    </span>
                </label>
                </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-semibold">Select Date & Time</h2>

            <label className="mt-4 block">
              <span className="text-sm text-slate-300">Installation Date</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm text-slate-300">Time Window</span>
              <select
                value={selectedWindow}
                onChange={(e) => setSelectedWindow(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
              >
                <option value="">Select a time window</option>
                {timeWindows.map((window) => (
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
            disabled={isSubmitting}
            className="w-full rounded-lg bg-cyan-500 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
          >
            {isSubmitting ? "Scheduling..." : "Confirm Installation"}
          </button>
        </form>
      </div>
    </main>
  );
}