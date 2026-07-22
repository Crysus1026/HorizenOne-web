"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  addDoc,
  arrayUnion,
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
import { auth, db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

type CompletionValue = string | number | boolean;

type WorkOrder = {
  id: string;
  customerName?: string;
  companyId?: string;
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
  photoUrls?: string[];
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
  thermostatType?: string;
  inventoryUnitId?: string;
  inventoryItemId?: string;
  itemName?: string;
  serialNumber?: string;
  location?: string;
  systemType?: string;
  notes?: string;
};

type InventoryUnit = {
  id: string;
  inventoryItemId: string;
  itemName: string;
  serialNumber: string;
  status: string;
  assignedTechnicianId?: string;
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

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [completionDevices, setCompletionDevices] = useState<CompletionDevice[]>([]);

  const [assignedInventoryUnits, setAssignedInventoryUnits] = useState<InventoryUnit[]>([]);
  const [selectedInventoryUnitId, setSelectedInventoryUnitId] = useState("");
  
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

        const assignedInventoryQuery = query(
          collection(db, "inventoryUnits"),
          where("assignedTechnicianId", "==", currentUser.uid),
          where("status", "==", "assigned")
        );

        const assignedInventorySnapshot = await getDocs(assignedInventoryQuery);

        const assignedInventoryData = assignedInventorySnapshot.docs.map((document) => ({
          id: document.id,
          ...(document.data() as Omit<InventoryUnit, "id">),
        }));

        setAssignedInventoryUnits(assignedInventoryData);

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
        thermostatType: "",
        inventoryUnitId: "",
        inventoryItemId: "",
        itemName: "",
        serialNumber: "",
        location: "",
        systemType: "",
        notes: "",
      },
    ]);
  }

function handleCompletionDeviceChange(
  deviceId: string,
  fieldName: "thermostatType" | "location" | "systemType" | "notes",
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

function handleCompletionDeviceInventoryChange(
  deviceId: string,
  inventoryUnitId: string
) {
  const selectedUnit = assignedInventoryUnits.find(
    (unit) => unit.id === inventoryUnitId
  );

  setCompletionDevices((current) =>
    current.map((device) =>
      device.id === deviceId
        ? {
            ...device,
            inventoryUnitId,
            inventoryItemId: selectedUnit?.inventoryItemId || "",
            itemName: selectedUnit?.itemName || "",
            serialNumber: selectedUnit?.serialNumber || "",
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

async function handlePhotoUpload(
  e: React.ChangeEvent<HTMLInputElement>
) {
  if (!workOrderId || !workOrder || uploadingPhoto) return;

  const files = Array.from(e.target.files || []);

  if (files.length === 0) return;

  setUploadingPhoto(true);

  try {
    const downloadUrls: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        throw new Error(`${file.name} is not a valid image file.`);
      }

      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");

      const filePath =
        `workOrders/${workOrderId}/photos/` +
        `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

      const storageRef = ref(storage, filePath);

      await uploadBytes(storageRef, file);

      const downloadUrl = await getDownloadURL(storageRef);

      downloadUrls.push(downloadUrl);
    }

    if (downloadUrls.length === 0) return;

    const workOrderRef = doc(db, "workOrders", workOrderId);

    await updateDoc(workOrderRef, {
      photoUrls: arrayUnion(...downloadUrls),
      updatedAt: serverTimestamp(),
    });

    setWorkOrder((previous) =>
      previous
        ? {
            ...previous,
            photoUrls: [
              ...(previous.photoUrls || []),
              ...downloadUrls,
            ],
          }
        : previous
    );
  } catch (err) {
    console.error("Error uploading photos:", err);

    alert(
      err instanceof Error
        ? err.message
        : "Failed to upload one or more photos."
    );
  } finally {
    setUploadingPhoto(false);
    e.target.value = "";
  }
}

function isTurndownCompletion() {
  if (!completionTemplate) return false;

  const completionTypeField = completionTemplate.fields.find(
    (field) =>
      field.label.trim().toLowerCase() === "completion type"
  );

  if (!completionTypeField) return false;

  const completionTypeValue =
    completionData[completionTypeField.fieldKey];

  return (
    String(completionTypeValue || "")
      .trim()
      .toLowerCase() === "turndown"
  );
}

  function validateCompletionForm() {
    if (!completionTemplate) {
      setCompletionError(
        "No completion form template was found for this work order."
      );
      return false;
    }

    const isTurndown = isTurndownCompletion();

    for (const field of completionTemplate.fields) {
      if (!field.required) continue;

      const value = completionData[field.fieldKey];

      const isSerialNumberField =
        field.label.toLowerCase().includes("serial");

      /*
      * A turndown does not require an installed-device serial number.
      */
      if (isTurndown && isSerialNumberField) {
        continue;
      }

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

    /*
    * Additional installed-device details are not required for
    * a turndown because no device was installed.
    */
    if (!isTurndown) {
      for (const device of completionDevices) {
        if (!device.thermostatType?.trim()) {
          setCompletionError(
            "Each added device needs a thermostat type."
          );
          return false;
        }

        if (!device.inventoryUnitId?.trim()) {
          setCompletionError(
            "Each added device needs a selected inventory serial number."
          );
          return false;
        }

        if (!device.location?.trim()) {
          setCompletionError(
            "Each added device needs an install location."
          );
          return false;
        }

        if (!device.systemType?.trim()) {
          setCompletionError(
            "Each added device needs a system type."
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
      const isTurndown = isTurndownCompletion();

      const savedCompletionDevices = isTurndown
        ? []
        : completionDevices;

      await updateDoc(workOrderRef, {
        status: "Completed",
        completionData,
        completionDevices: savedCompletionDevices,
        completionNotes,
        completionTemplateId: completionTemplate?.id || "",
        completedAt: serverTimestamp(),
        completedByTechnicianId: workOrder.assignedTechnicianId || "",
        completedByTechnicianName: workOrder.assignedTechnicianName || "",
        updatedAt: serverTimestamp(),
      });

const isTurndown = isTurndownCompletion();

if (!isTurndown && selectedInventoryUnitId) {
  const selectedUnit = assignedInventoryUnits.find(
    (unit) => unit.id === selectedInventoryUnitId
  );

  if (selectedUnit) {
    await updateDoc(doc(db, "inventoryUnits", selectedUnit.id), {
      status: "installed",
      workOrderId: workOrder.id,
      workOrderNumber: workOrder.id,
      installedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(db, "inventoryTransactions"), {
      companyId: workOrder.companyId || "",
      inventoryItemId: selectedUnit.inventoryItemId,
      inventoryUnitId: selectedUnit.id,
      itemName: selectedUnit.itemName,
      serialNumber: selectedUnit.serialNumber,
      type: "installed",
      toTechnicianId: workOrder.assignedTechnicianId || "",
      toTechnicianName: workOrder.assignedTechnicianName || "",
      workOrderId: workOrder.id,
      workOrderNumber: workOrder.id,
      notes: "Installed during work order completion",
      createdAt: serverTimestamp(),
    });
  }
}

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

        {field.type === "text" && field.label.toLowerCase().includes("serial") && (
  <select
    value={selectedInventoryUnitId}
    onChange={(e) => {
      const unitId = e.target.value;
      const selectedUnit = assignedInventoryUnits.find(
        (unit) => unit.id === unitId
      );

      setSelectedInventoryUnitId(unitId);

      handleCompletionFieldChange(
        field.fieldKey,
        selectedUnit?.serialNumber || ""
      );
    }}
    className={sharedClassName}
  >
    <option value="">Select inventory device</option>

    {assignedInventoryUnits.map((unit) => (
      <option key={unit.id} value={unit.id}>
        {unit.itemName} - {unit.serialNumber}
      </option>
    ))}
  </select>
)}

{field.type === "text" && !field.label.toLowerCase().includes("serial") && (
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
                    Thermostat Type *
                  </label>

                  <input
                    value={device.thermostatType || ""}
                    onChange={(e) =>
                      handleCompletionDeviceChange(
                        device.id,
                        "thermostatType",
                        e.target.value
                      )
                    }
                    placeholder="Example: X2S Smart Thermostat"
                    className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400">
                    Serial Number *
                  </label>

                  <select
                    value={device.inventoryUnitId || ""}
                    onChange={(e) =>
                      handleCompletionDeviceInventoryChange(
                        device.id,
                        e.target.value
                      )
                    }
                    className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-cyan-500"
                  >
                    <option value="">Select inventory device</option>

                    {assignedInventoryUnits
                      .filter(
                        (unit) =>
                          unit.id === device.inventoryUnitId ||
                          !completionDevices.some(
                            (selectedDevice) =>
                              selectedDevice.inventoryUnitId === unit.id &&
                              selectedDevice.id !== device.id
                          )
                      )
                      .map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.itemName} - {unit.serialNumber}
                        </option>
                      ))}
                  </select>

                  <p className="mt-2 text-xs text-zinc-500">
                    Only inventory assigned to this technician appears here.
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400">
                    Install Location *
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
                    placeholder="Example: Hallway, basement, bedroom"
                    className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400">
                    System Type *
                  </label>

                  <input
                    value={device.systemType || ""}
                    onChange={(e) =>
                      handleCompletionDeviceChange(
                        device.id,
                        "systemType",
                        e.target.value
                      )
                    }
                    placeholder="Example: Heat Pump, Gas Furnace, AC"
                    className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 p-3 text-white outline-none focus:border-cyan-500"
                  />
                </div>

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

<div className="mt-6 rounded-lg border border-zinc-800 bg-black p-4">
  <h3 className="text-base font-bold text-white">Photos</h3>

  <p className="mt-1 text-sm text-zinc-500">
    Upload job photos from the technician workflow.
  </p>

  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
  <label
    className={`flex flex-1 items-center justify-center rounded-md border border-cyan-500 bg-black px-4 py-3 text-center text-sm font-medium text-cyan-300 transition ${
      uploadingPhoto
        ? "cursor-not-allowed opacity-50"
        : "cursor-pointer hover:bg-cyan-500/10"
    }`}
  >
    Take Photo

    <input
      type="file"
      accept="image/*"
      capture="environment"
      onChange={handlePhotoUpload}
      disabled={uploadingPhoto}
      className="hidden"
    />
  </label>

  <label
    className={`flex flex-1 items-center justify-center rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-center text-sm font-medium text-zinc-300 transition ${
      uploadingPhoto
        ? "cursor-not-allowed opacity-50"
        : "cursor-pointer hover:bg-zinc-900"
    }`}
  >
    Choose From Gallery

    <input
      type="file"
      accept="image/*"
      multiple
      onChange={handlePhotoUpload}
      disabled={uploadingPhoto}
      className="hidden"
    />
  </label>
</div>

  {uploadingPhoto && (
    <p className="mt-3 text-sm text-cyan-400">Uploading photo...</p>
  )}

  <div className="mt-5 grid gap-4 sm:grid-cols-2">
    {(workOrder.photoUrls || []).length === 0 ? (
      <p className="text-sm text-zinc-500">No photos uploaded yet.</p>
    ) : (
      workOrder.photoUrls?.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="overflow-hidden rounded-lg border border-zinc-800 bg-black"
        >
          <img
            src={url}
            alt="Work order upload"
            className="h-40 w-full object-cover transition hover:opacity-80"
          />
        </a>
      ))
    )}
  </div>
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
