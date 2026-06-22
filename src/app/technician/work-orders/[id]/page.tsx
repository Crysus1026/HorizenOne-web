"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";

type CompletionValue = string | number | boolean;

type WorkOrder = {
  id: string;
  customerName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  serviceTypeId?: string;
  serviceTypeName?: string;
  scheduledDate?: string;
  timeWindow?: string;
  notes?: string;
  status?: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  completionNotes?: string;
  completionTemplateId?: string;
  completionDevices?: CompletionDevice[];
  completionData?: Record<string, CompletionValue>;
  completionPhotoUrls?: string[];
  completedAt?: unknown;
  completedByTechnicianId?: string;
  completedByTechnicianName?: string;
};

type CompletionField = {
  fieldKey: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "select"
    | "checkbox"
    | "date"
    | "photo"
    | "signature";
  required?: boolean;
  options?: string[];
  order?: number;
};

type CompletionTemplate = {
  id: string;
  name: string;
  serviceTypeId?: string;
  projectId?: string;
  isActive?: boolean;
  fields: CompletionField[];
};

type CompletionDevice = {
  id: string;
  deviceTypeId?: string;
  deviceTypeName?: string;
  serialNumber?: string;
  location?: string;
  notes?: string;
  completionData: Record<string, CompletionValue>;
};

export default function TechnicianWorkOrderPage() {
  const params = useParams();
  const router = useRouter();
  const workOrderId = params.id as string;

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [completionTemplate, setCompletionTemplate] =
    useState<CompletionTemplate | null>(null);
  const [completionData, setCompletionData] = useState<
    Record<string, CompletionValue>
  >({});
  const [completionNotes, setCompletionNotes] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState("");
  const [completionError, setCompletionError] = useState("");

  const [completionDevices, setCompletionDevices] = useState<CompletionDevice[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setIsLoading(true);
        setError("");
        setCompletionError("");
        setCompletionTemplate(null);

        if (!currentUser) {
          setError("You must be logged in to view this work order.");
          return;
        }

        const workOrderRef = doc(db, "workOrders", workOrderId);
        const workOrderSnap = await getDoc(workOrderRef);

        if (!workOrderSnap.exists()) {
          setError("Work order not found.");
          return;
        }

        const workOrderData = {
          id: workOrderSnap.id,
          ...workOrderSnap.data(),
        } as WorkOrder;

        if (workOrderData.assignedTechnicianId !== currentUser.uid) {
          setError("You do not have access to this work order.");
          return;
        }

        setWorkOrder(workOrderData);
        setCompletionNotes(workOrderData.completionNotes || "");
        setCompletionData(workOrderData.completionData || {});
        setCompletionDevices(workOrderData.completionDevices || []);

        if (!workOrderData.serviceTypeId) return;

        const templatesQuery = query(
          collection(db, "completionFormTemplates"),
          where("serviceTypeId", "==", workOrderData.serviceTypeId),
          where("isActive", "==", true)
        );

        const templatesSnapshot = await getDocs(templatesQuery);

        if (!templatesSnapshot.empty) {
          const templateDoc = templatesSnapshot.docs[0];

          setCompletionTemplate({
            id: templateDoc.id,
            ...templateDoc.data(),
          } as CompletionTemplate);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load work order.");
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [workOrderId]);

  function handleCompletionFieldChange(
    fieldId: string,
    value: CompletionValue
  ) {
    setCompletionData((current) => ({
      ...current,
      [fieldId]: value,
    }));
  }

  function handleAddCompletionDevice() {
  setCompletionDevices((current) => [
    ...current,
    {
      id: crypto.randomUUID(),
      serialNumber: "",
      location: "",
      notes: "",
      completionData: {},
    },
  ]);
}

function handleCompletionDeviceChange(
  deviceId: string,
  fieldName: "serialNumber" | "location" | "notes",
  value: string
) {
  setCompletionDevices((current) =>
    current.map((device) =>
      device.id === deviceId
        ? {
            ...device,
            [fieldName]: value,
          }
        : device
    )
  );
}

function handleCompletionDeviceFieldChange(
  deviceId: string,
  fieldId: string,
  value: CompletionValue
) {
  setCompletionDevices((current) =>
    current.map((device) =>
      device.id === deviceId
        ? {
            ...device,
            completionData: {
              ...device.completionData,
              [fieldId]: value,
            },
          }
        : device
    )
  );
}

function handleRemoveCompletionDevice(deviceId: string) {
  setCompletionDevices((current) =>
    current.filter((device) => device.id !== deviceId)
  );
}

  function validateCompletionForm() {
    if (!completionTemplate) {
      setCompletionError(
        "No completion form template was found for this work order."
      );
      return false;
    }

    for (const field of completionTemplate.fields) {
      if (!field.required) continue;

      const value = completionData[field.fieldKey];

      if (
        value === undefined ||
        value === null ||
        value === "" ||
        value === false
      ) {
        setCompletionError(`${field.label} is required.`);
        return false;
      }
    }

    for (const device of completionDevices) {
  if (!device.serialNumber?.trim()) {
    setCompletionError("Each added device needs a serial number.");
    return false;
  }

  if (!device.location?.trim()) {
    setCompletionError("Each added device needs a location.");
    return false;
  }

  for (const field of completionTemplate.fields) {
    if (!field.required) continue;

    const value = device.completionData[field.fieldKey];

    if (
      value === undefined ||
      value === null ||
      value === "" ||
      value === false
    ) {
      setCompletionError(
        `${field.label} is required for each added device.`
      );
      return false;
    }
  }
}

    setCompletionError("");
    return true;
  }

  async function handleCompleteWorkOrder() {
    if (!workOrder) return;

    if (!validateCompletionForm()) return;

    try {
      setIsCompleting(true);
      setError("");
      setCompletionError("");

      const workOrderRef = doc(db, "workOrders", workOrder.id);

      await updateDoc(workOrderRef, {
        status: "Completed",
        completionData,
        completionDevices,
        completionNotes,
        completionTemplateId: completionTemplate?.id || "",
        completedAt: serverTimestamp(),
        completedByTechnicianId: workOrder.assignedTechnicianId || "",
        completedByTechnicianName: workOrder.assignedTechnicianName || "",
        updatedAt: serverTimestamp(),
      });

      router.push("/technician");
    } catch (err) {
      console.error(err);
      setError("Failed to complete work order.");
    } finally {
      setIsCompleting(false);
    }
  }

  function renderCompletionField(field: CompletionField) {
    const sharedClassName =
      "mt-2 w-full rounded-md border border-zinc-700 bg-black p-3 text-white outline-none focus:border-cyan-500";

    const value = completionData[field.fieldKey];

    return (
      <div key={field.fieldKey}>
        <label className="block text-sm font-medium text-zinc-300">
          {field.label}
          {field.required && <span className="text-red-400"> *</span>}
        </label>

        {field.type === "text" && (
          <input
            value={String(value ?? "")}
            onChange={(e) =>
              handleCompletionFieldChange(field.fieldKey, e.target.value)
            }
            className={sharedClassName}
          />
        )}

        {field.type === "number" && (
          <input
            type="number"
            value={String(value ?? "")}
            onChange={(e) =>
              handleCompletionFieldChange(field.fieldKey, e.target.value)
            }
            className={sharedClassName}
          />
        )}

        {field.type === "textarea" && (
          <textarea
            value={String(value ?? "")}
            onChange={(e) =>
              handleCompletionFieldChange(field.fieldKey, e.target.value)
            }
            rows={4}
            className={sharedClassName}
          />
        )}

        {field.type === "select" && (
          <select
            value={String(value ?? "")}
            onChange={(e) =>
              handleCompletionFieldChange(field.fieldKey, e.target.value)
            }
            className={sharedClassName}
          >
            <option value="">Select one</option>
            {(field.options ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}

        {field.type === "checkbox" && (
          <label className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) =>
                handleCompletionFieldChange(field.fieldKey, e.target.checked)
              }
            />
            Yes
          </label>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="flex h-20 items-center justify-between border-b border-cyan-500 px-4">
        <Image
          src="/logo.png"
          alt="HorizenOne"
          width={80}
          height={80}
          className="object-contain"
        />

        <button
          onClick={() => router.push("/technician")}
          className="rounded-md border border-cyan-500 px-3 py-2 text-sm text-cyan-400"
        >
          Back
        </button>
      </header>

      <main className="space-y-5 p-4">
        {error && (
          <div className="rounded-md border border-red-500 bg-red-950 p-3 text-red-300">
            {error}
          </div>
        )}

        {isLoading ? (
          <p className="text-zinc-400">Loading work order...</p>
        ) : workOrder ? (
          <>
            <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-400">Customer</p>

              <h1 className="mt-1 text-2xl font-bold text-cyan-400">
                {workOrder.customerName || "No customer"}
              </h1>

              {workOrder.address && (
                <p className="mt-3 text-zinc-300">{workOrder.address}</p>
              )}

              {(workOrder.city || workOrder.state || workOrder.zip) && (
                <p className="text-zinc-400">
                  {workOrder.city} {workOrder.state} {workOrder.zip}
                </p>
              )}

              {workOrder.phone && (
                <p className="mt-3 text-zinc-400">
                  Phone: {workOrder.phone}
                </p>
              )}

              {workOrder.email && (
                <p className="text-zinc-400">Email: {workOrder.email}</p>
              )}
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-400">Work Order</p>

              <h2 className="mt-1 text-xl font-bold text-white">
                {workOrder.serviceTypeName || "Service"}
              </h2>

              <div className="mt-4 grid gap-3 text-sm">
                <div>
                  <p className="text-zinc-500">Date</p>
                  <p className="text-zinc-200">
                    {workOrder.scheduledDate || "Not scheduled"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500">Time Window</p>
                  <p className="text-zinc-200">
                    {workOrder.timeWindow || "No time window"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500">Status</p>
                  <p className="text-zinc-200">
                    {workOrder.status || "Assigned"}
                  </p>
                </div>
              </div>

              {workOrder.notes && (
                <div className="mt-5 rounded-md bg-black p-3">
                  <p className="mb-1 text-sm text-zinc-500">Job Notes</p>
                  <p className="whitespace-pre-wrap text-sm text-zinc-300">
                    {workOrder.notes}
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h2 className="text-lg font-bold text-white">
                Completion Form
              </h2>

              {!completionTemplate ? (
                <p className="mt-3 text-sm text-zinc-400">
                  No completion form template was found for this service type.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {completionTemplate.fields.map((field, index) => (
                    <div key={`${field.fieldKey || "field"}-${index}`}>
                      {renderCompletionField(field)}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 border-t border-zinc-800 pt-5">
  <div className="flex items-center justify-between gap-3">
    <div>
      <h3 className="text-base font-bold text-white">
        Additional Devices
      </h3>
      <p className="text-sm text-zinc-500">
        Add any extra devices completed during this visit.
      </p>
    </div>

    <button
      type="button"
      onClick={handleAddCompletionDevice}
      className="rounded-md border border-cyan-500 px-3 py-2 text-sm font-semibold text-cyan-400"
    >
      + Add Device
    </button>
  </div>

  {completionDevices.length > 0 && (
    <div className="mt-4 space-y-4">
      {completionDevices.map((device, deviceIndex) => (
        <div
          key={device.id}
          className="rounded-lg border border-zinc-800 bg-black p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold text-cyan-400">
              Device {deviceIndex + 1}
            </h4>

            <button
              type="button"
              onClick={() => handleRemoveCompletionDevice(device.id)}
              className="text-sm text-red-400"
            >
              Remove
            </button>
          </div>

          <div className="mt-4 grid gap-4">
            <div>
              <label className="block text-sm text-zinc-400">
                Serial Number *
              </label>
              <input
                value={device.serialNumber || ""}
                onChange={(e) =>
                  handleCompletionDeviceChange(
                    device.id,
                    "serialNumber",
                    e.target.value
                  )
                }
                className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400">
                Location *
              </label>
              <input
                value={device.location || ""}
                onChange={(e) =>
                  handleCompletionDeviceChange(
                    device.id,
                    "location",
                    e.target.value
                  )
                }
                placeholder="Example: Basement, attic, outdoor unit"
                className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-cyan-500"
              />
            </div>

            {completionTemplate?.fields.map((field, index) => {
              const value = device.completionData[field.fieldKey];

              return (
                <div key={`${device.id}-${field.fieldKey || "field"}-${index}`}>
                  <label className="block text-sm font-medium text-zinc-300">
                    {field.label}
                    {field.required && (
                      <span className="text-red-400"> *</span>
                    )}
                  </label>

                  {field.type === "text" && (
                    <input
                      value={String(value ?? "")}
                      onChange={(e) =>
                        handleCompletionDeviceFieldChange(
                          device.id,
                          field.fieldKey,
                          e.target.value
                        )
                      }
                      className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-cyan-500"
                    />
                  )}

                  {field.type === "number" && (
                    <input
                      type="number"
                      value={String(value ?? "")}
                      onChange={(e) =>
                        handleCompletionDeviceFieldChange(
                          device.id,
                          field.fieldKey,
                          e.target.value
                        )
                      }
                      className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-cyan-500"
                    />
                  )}

                  {field.type === "textarea" && (
                    <textarea
                      value={String(value ?? "")}
                      onChange={(e) =>
                        handleCompletionDeviceFieldChange(
                          device.id,
                          field.fieldKey,
                          e.target.value
                        )
                      }
                      rows={3}
                      className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-cyan-500"
                    />
                  )}

                  {field.type === "select" && (
                    <select
                      value={String(value ?? "")}
                      onChange={(e) =>
                        handleCompletionDeviceFieldChange(
                          device.id,
                          field.fieldKey,
                          e.target.value
                        )
                      }
                      className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-cyan-500"
                    >
                      <option value="">Select one</option>
                      {(field.options ?? []).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === "checkbox" && (
                    <label className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) =>
                          handleCompletionDeviceFieldChange(
                            device.id,
                            field.fieldKey,
                            e.target.checked
                          )
                        }
                      />
                      Yes
                    </label>
                  )}
                </div>
              );
            })}

            <div>
              <label className="block text-sm text-zinc-400">
                Device Notes
              </label>
              <textarea
                value={device.notes || ""}
                onChange={(e) =>
                  handleCompletionDeviceChange(
                    device.id,
                    "notes",
                    e.target.value
                  )
                }
                rows={3}
                className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>

              <label className="mt-6 block text-sm text-zinc-400">
                Completion Notes
              </label>

              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={5}
                className="mt-2 w-full rounded-md border border-zinc-700 bg-black p-3 text-white outline-none focus:border-cyan-500"
                placeholder="Enter work completed, issues found, or follow-up needed..."
              />

              {completionError && (
                <div className="mt-4 rounded-md border border-red-500 bg-red-950 p-3 text-red-300">
                  {completionError}
                </div>
              )}

              <button
                onClick={handleCompleteWorkOrder}
                disabled={isCompleting || workOrder.status === "Completed"}
                className="mt-4 w-full rounded-md bg-cyan-500 px-4 py-3 font-bold text-black hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCompleting ? "Completing..." : "Mark Complete"}
              </button>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
