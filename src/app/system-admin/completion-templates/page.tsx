"use client";

import AppShell from "@/components/AppShell";
import { auth, db } from "@/lib/firebase";
import { getUserProfile } from "@/lib/getUserProfile";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Company = {
  id: string;
  name?: string;
  isActive?: boolean;
};

type Project = {
  id: string;
  companyId?: string;
  name?: string;
  isActive?: boolean;
};

type ServiceType = {
  id: string;
  companyId?: string;
  name?: string;
  isActive?: boolean;
};

type DeviceType = {
  id: string;
  companyId?: string;
  projectId?: string;
  name?: string;
  isActive?: boolean;
};

type TemplateField = {
  fieldKey: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
  order: number;
};

type CompletionTemplate = {
  id: string;
  companyId?: string;
  companyName?: string;
  projectId?: string;
  projectName?: string;
  serviceTypeId?: string;
  serviceTypeName?: string;
  deviceTypeId?: string;
  deviceTypeName?: string;
  name?: string;
  description?: string;
  fields?: TemplateField[];
  isActive?: boolean;
};

const fieldTypes = [
  "text",
  "number",
  "textarea",
  "select",
  "checkbox",
  "date",
  "photo",
  "signature",
];

export default function SystemAdminCompletionTemplatesPage() {
  const router = useRouter();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [templates, setTemplates] = useState<CompletionTemplate[]>([]);

  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [companyId, setCompanyId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [deviceTypeId, setDeviceTypeId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [fieldRequired, setFieldRequired] = useState(true);
  const [fieldOptions, setFieldOptions] = useState("");
  const [fields, setFields] = useState<TemplateField[]>([]);

  const [editingTemplate, setEditingTemplate] =
  useState<CompletionTemplate | null>(null);

  const [isUpdating, setIsUpdating] = useState(false);

  const [editCompanyId, setEditCompanyId] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editServiceTypeId, setEditServiceTypeId] = useState("");
  const [editDeviceTypeId, setEditDeviceTypeId] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFields, setEditFields] = useState<TemplateField[]>([]);

  const [editFieldLabel, setEditFieldLabel] = useState("");
  const [editFieldType, setEditFieldType] = useState("text");
  const [editFieldRequired, setEditFieldRequired] = useState(true);
  const [editFieldOptions, setEditFieldOptions] = useState("");

  const filteredProjects = projects.filter(
    (project) => project.companyId === companyId && project.isActive
  );

  const filteredServiceTypes = serviceTypes.filter(
    (serviceType) => serviceType.isActive
  );

  const filteredDeviceTypes = deviceTypes.filter(
    (deviceType) => deviceType.isActive
  );

  const filteredEditProjects = projects.filter(
    (project) => project.companyId === editCompanyId && project.isActive
  );

  const filteredEditServiceTypes = serviceTypes.filter(
    (serviceType) => serviceType.isActive
  );

  const filteredEditDeviceTypes = deviceTypes.filter(
    (deviceType) => deviceType.isActive
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      const profile = await getUserProfile(user.uid);

      if (!profile?.isSystemAdmin) {
        router.push("/dashboard");
        return;
      }

      setIsCheckingAccess(false);
      await loadData();
    });

    return () => unsubscribe();
  }, [router]);

  async function loadData() {
    setIsLoading(true);
    setError("");

    try {
      const companiesSnap = await getDocs(
        query(
          collection(db, "companies"),
          where("isActive", "==", true),
          orderBy("name", "asc")
        )
      );

      setCompanies(
        companiesSnap.docs.map((companyDoc) => ({
          id: companyDoc.id,
          ...(companyDoc.data() as Omit<Company, "id">),
        }))
      );

      const projectsSnap = await getDocs(
        query(collection(db, "projects"), orderBy("name", "asc"))
      );

      setProjects(
        projectsSnap.docs.map((projectDoc) => ({
          id: projectDoc.id,
          ...(projectDoc.data() as Omit<Project, "id">),
        }))
      );

      const serviceTypesSnap = await getDocs(
        query(collection(db, "serviceTypes"), orderBy("name", "asc"))
      );

      setServiceTypes(
        serviceTypesSnap.docs.map((serviceTypeDoc) => ({
          id: serviceTypeDoc.id,
          ...(serviceTypeDoc.data() as Omit<ServiceType, "id">),
        }))
      );

      const deviceTypesSnap = await getDocs(
        query(collection(db, "deviceTypes"), orderBy("name", "asc"))
      );

      setDeviceTypes(
        deviceTypesSnap.docs.map((deviceTypeDoc) => ({
          id: deviceTypeDoc.id,
          ...(deviceTypeDoc.data() as Omit<DeviceType, "id">),
        }))
      );

      const templatesSnap = await getDocs(
        query(collection(db, "completionFormTemplates"), orderBy("name", "asc"))
      );

      setTemplates(
        templatesSnap.docs.map((templateDoc) => ({
          id: templateDoc.id,
          ...(templateDoc.data() as Omit<CompletionTemplate, "id">),
        }))
      );
    } catch (err) {
      console.error(err);
      setError("Unable to load completion templates.");
    } finally {
      setIsLoading(false);
    }
  }

  function makeFieldKey(label: string) {
    return label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function addField() {
    setError("");

    if (!fieldLabel.trim()) {
      setError("Field label is required.");
      return;
    }

    const fieldKey = makeFieldKey(fieldLabel);

    if (!fieldKey) {
      setError("Field label must contain letters or numbers.");
      return;
    }

    if (fields.some((field) => field.fieldKey === fieldKey)) {
      setError("A field with this label already exists.");
      return;
    }

    const options =
      fieldType === "select"
        ? fieldOptions
            .split(",")
            .map((option) => option.trim())
            .filter(Boolean)
        : [];

    if (fieldType === "select" && options.length === 0) {
      setError("Select fields require at least one option.");
      return;
    }

    setFields((prev) => [
      ...prev,
      {
        fieldKey,
        label: fieldLabel.trim(),
        type: fieldType,
        required: fieldRequired,
        options,
        order: prev.length + 1,
      },
    ]);

    setFieldLabel("");
    setFieldType("text");
    setFieldRequired(true);
    setFieldOptions("");
  }

  function removeField(fieldKey: string) {
    setFields((prev) =>
      prev
        .filter((field) => field.fieldKey !== fieldKey)
        .map((field, index) => ({
          ...field,
          order: index + 1,
        }))
    );
  }

  function resetForm() {
    setCompanyId("");
    setProjectId("");
    setServiceTypeId("");
    setDeviceTypeId("");
    setName("");
    setDescription("");
    setFields([]);
    setFieldLabel("");
    setFieldType("text");
    setFieldRequired(true);
    setFieldOptions("");
  }

  async function handleCreateTemplate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!companyId) {
      setError("Company is required.");
      return;
    }

    if (!projectId) {
      setError("Project is required.");
      return;
    }

    if (!serviceTypeId) {
      setError("Service type is required.");
      return;
    }

    if (!deviceTypeId) {
      setError("Device type is required.");
      return;
    }

    if (!name.trim()) {
      setError("Template name is required.");
      return;
    }

    if (fields.length === 0) {
      setError("Add at least one completion field.");
      return;
    }

    const selectedCompany = companies.find((company) => company.id === companyId);
    const selectedProject = projects.find((project) => project.id === projectId);
    const selectedServiceType = serviceTypes.find(
      (serviceType) => serviceType.id === serviceTypeId
    );
    const selectedDeviceType = deviceTypes.find(
      (deviceType) => deviceType.id === deviceTypeId
    );

    if (!selectedCompany || !selectedProject || !selectedServiceType || !selectedDeviceType) {
      setError("One or more selected records could not be found.");
      return;
    }

    setIsSaving(true);

    try {
      await addDoc(collection(db, "completionFormTemplates"), {
        companyId,
        companyName: selectedCompany.name || "",
        projectId,
        projectName: selectedProject.name || "",
        serviceTypeId,
        serviceTypeName: selectedServiceType.name || "",
        deviceTypeId,
        deviceTypeName: selectedDeviceType.name || "",
        name: name.trim(),
        description: description.trim(),
        fields,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      resetForm();
      await loadData();
    } catch (err) {
      console.error(err);
      setError("Unable to create completion template.");
    } finally {
      setIsSaving(false);
    }
  }

  function openEditTemplate(template: CompletionTemplate) {
  setEditingTemplate(template);

  setEditCompanyId(template.companyId || "");
  setEditProjectId(template.projectId || "");
  setEditServiceTypeId(template.serviceTypeId || "");
  setEditDeviceTypeId(template.deviceTypeId || "");
  setEditName(template.name || "");
  setEditDescription(template.description || "");
  setEditFields(
    [...(template.fields || [])]
      .sort((a, b) => a.order - b.order)
      .map((field, index) => ({
        ...field,
        fieldKey: field.fieldKey || `${makeFieldKey(field.label)}_${index + 1}`,
        order: index + 1,
      }))
  );
  setEditFieldLabel("");
  setEditFieldType("text");
  setEditFieldRequired(true);
  setEditFieldOptions("");
}

function moveEditField(index: number, direction: "up" | "down") {
  setEditFields((prev) => {
    const newFields = [...prev];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newFields.length) {
      return prev;
    }

    const temp = newFields[index];
    newFields[index] = newFields[targetIndex];
    newFields[targetIndex] = temp;

    return newFields.map((field, fieldIndex) => ({
      ...field,
      order: fieldIndex + 1,
    }));
  });
}

function removeEditField(fieldKey: string) {
  setEditFields((prev) =>
    prev
      .filter((field) => field.fieldKey !== fieldKey)
      .map((field, index) => ({
        ...field,
        order: index + 1,
      }))
  );
}

function addEditField() {
  setError("");

  if (!editFieldLabel.trim()) {
    setError("Field label is required.");
    return;
  }

  const fieldKey = makeFieldKey(editFieldLabel);

  if (!fieldKey) {
    setError("Field label must contain letters or numbers.");
    return;
  }

  if (editFields.some((field) => field.fieldKey === fieldKey)) {
    setError("A field with this label already exists on this template.");
    return;
  }

  const options =
    editFieldType === "select"
      ? editFieldOptions
          .split(",")
          .map((option) => option.trim())
          .filter(Boolean)
      : [];

  if (editFieldType === "select" && options.length === 0) {
    setError("Select fields require at least one option.");
    return;
  }

  setEditFields((prev) => [
    ...prev,
    {
      fieldKey,
      label: editFieldLabel.trim(),
      type: editFieldType,
      required: editFieldRequired,
      options,
      order: prev.length + 1,
    },
  ]);

  setEditFieldLabel("");
  setEditFieldType("text");
  setEditFieldRequired(true);
  setEditFieldOptions("");
}

function updateEditField(
  fieldKey: string,
  updates: Partial<TemplateField>
) {
  setEditFields((prev) =>
    prev.map((field) =>
      field.fieldKey === fieldKey
        ? {
            ...field,
            ...updates,
          }
        : field
    )
  );
}

async function saveTemplateChanges() {
  if (!editingTemplate) return;

  setError("");

  if (!editCompanyId) {
    setError("Company is required.");
    return;
  }

  if (!editProjectId) {
    setError("Project is required.");
    return;
  }

  if (!editServiceTypeId) {
    setError("Service type is required.");
    return;
  }

  if (!editDeviceTypeId) {
    setError("Device type is required.");
    return;
  }

  if (!editName.trim()) {
    setError("Template name is required.");
    return;
  }

  if (editFields.length === 0) {
    setError("Template must have at least one field.");
    return;
  }

  const selectedCompany = companies.find(
    (company) => company.id === editCompanyId
  );

  const selectedProject = projects.find(
    (project) => project.id === editProjectId
  );

  const selectedServiceType = serviceTypes.find(
    (serviceType) => serviceType.id === editServiceTypeId
  );

  const selectedDeviceType = deviceTypes.find(
    (deviceType) => deviceType.id === editDeviceTypeId
  );

  if (
    !selectedCompany ||
    !selectedProject ||
    !selectedServiceType ||
    !selectedDeviceType
  ) {
    setError("One or more selected records could not be found.");
    return;
  }

  const invalidSelectField = editFields.find(
  (field) => field.type === "select" && (!field.options || field.options.length === 0)
);

if (invalidSelectField) {
  setError(`Select field "${invalidSelectField.label}" needs at least one option.`);
  return;
}

  setIsUpdating(true);

  try {
    await updateDoc(doc(db, "completionFormTemplates", editingTemplate.id), {
      companyId: editCompanyId,
      companyName: selectedCompany.name || "",
      projectId: editProjectId,
      projectName: selectedProject.name || "",
      serviceTypeId: editServiceTypeId,
      serviceTypeName: selectedServiceType.name || "",
      deviceTypeId: editDeviceTypeId,
      deviceTypeName: selectedDeviceType.name || "",
      name: editName.trim(),
      description: editDescription.trim(),
      fields: editFields.map((field, index) => ({
        ...field,
        order: index + 1,
      })),
      updatedAt: serverTimestamp(),
    });

    setEditingTemplate(null);
    await loadData();
  } catch (err) {
    console.error(err);
    setError("Unable to update completion template.");
  } finally {
    setIsUpdating(false);
  }
}

async function duplicateTemplate(template: CompletionTemplate) {
  setError("");

  try {
    await addDoc(collection(db, "completionFormTemplates"), {
      companyId: template.companyId || "",
      companyName: template.companyName || "",
      projectId: template.projectId || "",
      projectName: template.projectName || "",
      serviceTypeId: template.serviceTypeId || "",
      serviceTypeName: template.serviceTypeName || "",
      deviceTypeId: template.deviceTypeId || "",
      deviceTypeName: template.deviceTypeName || "",
      name: `${template.name || "Completion Template"} Copy`,
      description: template.description || "",
      fields: [...(template.fields || [])].map((field, index) => ({
        ...field,
        order: index + 1,
      })),
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await loadData();
  } catch (err) {
    console.error(err);
    setError("Unable to duplicate completion template.");
  }
}

  async function toggleTemplateStatus(template: CompletionTemplate) {
    setError("");

    try {
      await updateDoc(doc(db, "completionFormTemplates", template.id), {
        isActive: !template.isActive,
        updatedAt: serverTimestamp(),
      });

      await loadData();
    } catch (err) {
      console.error(err);
      setError("Unable to update completion template status.");
    }
  }

  if (isCheckingAccess) {
    return (
      <AppShell>
        <p className="text-sm text-slate-400">Checking access...</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 px-6 text-white">
        <div>
          <p className="text-sm font-medium text-cyan-400">
            System Administrator
          </p>
          <h1 className="text-2xl font-bold text-white">
            Completion Templates
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Create technician closeout forms by company, project, service type,
            and device type.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {editingTemplate && (
  <section className="rounded-xl border border-cyan-700 bg-slate-900 p-5 shadow-sm">
    <h2 className="text-lg font-semibold text-white">
      Edit Completion Template
    </h2>

    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <label className="block">
        <span className="text-sm font-medium text-slate-300">Company *</span>
        <select
          value={editCompanyId}
          onChange={(e) => {
            setEditCompanyId(e.target.value);
            setEditProjectId("");
            setEditServiceTypeId("");
            setEditDeviceTypeId("");
          }}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        >
          <option value="">Select company</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name || "Unnamed Company"}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-300">Project *</span>
        <select
          value={editProjectId}
          onChange={(e) => {
            setEditProjectId(e.target.value);
            setEditDeviceTypeId("");
          }}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        >
          <option value="">Select project</option>
          {filteredEditProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name || "Unnamed Project"}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-300">
          Service Type *
        </span>
        <select
          value={editServiceTypeId}
          onChange={(e) => setEditServiceTypeId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        >
          <option value="">Select service type</option>
          {filteredEditServiceTypes.map((serviceType) => (
            <option key={serviceType.id} value={serviceType.id}>
              {serviceType.name || "Unnamed Service Type"}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-300">
          Device Type *
        </span>
        <select
          value={editDeviceTypeId}
          onChange={(e) => setEditDeviceTypeId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        >
          <option value="">Select device type</option>
          {filteredEditDeviceTypes.map((deviceType) => (
            <option key={deviceType.id} value={deviceType.id}>
              {deviceType.name || "Unnamed Device Type"}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-300">
          Template Name *
        </span>
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        />
      </label>

      <label className="block md:col-span-2">
        <span className="text-sm font-medium text-slate-300">Description</span>
        <textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        />
      </label>
    </div>

    <div className="mt-5 rounded-lg border border-slate-700 bg-slate-950 p-4">
  <h3 className="text-sm font-semibold text-white">
    Add Field to Template
  </h3>

  <div className="mt-4 grid gap-4 md:grid-cols-4">
    <label className="block md:col-span-2">
      <span className="text-sm font-medium text-slate-300">
        Field Label
      </span>
      <input
        value={editFieldLabel}
        onChange={(e) => setEditFieldLabel(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        placeholder="Example: Device Serial Number"
      />
    </label>

    <label className="block">
      <span className="text-sm font-medium text-slate-300">
        Field Type
      </span>
      <select
        value={editFieldType}
        onChange={(e) => setEditFieldType(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
      >
        {fieldTypes.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
    </label>

    <label className="flex items-end gap-2">
      <input
        type="checkbox"
        checked={editFieldRequired}
        onChange={(e) => setEditFieldRequired(e.target.checked)}
        className="mb-3"
      />
      <span className="mb-2 text-sm font-medium text-slate-300">
        Required
      </span>
    </label>

    {editFieldType === "select" && (
      <label className="block md:col-span-4">
        <span className="text-sm font-medium text-slate-300">
          Options
        </span>
        <input
          value={editFieldOptions}
          onChange={(e) => setEditFieldOptions(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
          placeholder="Example: Yes, No, N/A"
        />
      </label>
    )}
  </div>

  <button
    type="button"
    onClick={addEditField}
    className="mt-4 rounded-lg border border-cyan-700 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-slate-800"
  >
    Add Field
  </button>
</div>

<div className="mt-5 rounded-lg border border-slate-700">
  <div className="border-b border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-300">
    Edit / Reorder Fields
  </div>

  <div className="divide-y divide-slate-700">
    {editFields.map((field, index) => (
      <div key={field.fieldKey} className="px-4 py-4">
        <div className="grid gap-4 md:grid-cols-4">
          <label className="block md:col-span-2">
            <span className="text-xs font-medium text-slate-400">
              Field Label
            </span>
            <input
              value={field.label}
              onChange={(e) =>
                updateEditField(field.fieldKey, {
                  label: e.target.value,
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-400">
              Field Type
            </span>
            <select
              value={field.type}
              onChange={(e) =>
                updateEditField(field.fieldKey, {
                  type: e.target.value,
                  options:
                    e.target.value === "select" ? field.options || [] : [],
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
            >
              {fieldTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-end gap-2">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) =>
                updateEditField(field.fieldKey, {
                  required: e.target.checked,
                })
              }
              className="mb-3"
            />
            <span className="mb-2 text-sm font-medium text-slate-300">
              Required
            </span>
          </label>

          {field.type === "select" && (
            <label className="block md:col-span-4">
              <span className="text-xs font-medium text-slate-400">
                Options
              </span>
              <input
                value={(field.options || []).join(", ")}
                onChange={(e) =>
                  updateEditField(field.fieldKey, {
                    options: e.target.value
                      .split(",")
                      .map((option) => option.trim())
                      .filter(Boolean),
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                placeholder="Example: Yes, No, N/A"
              />
            </label>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => moveEditField(index, "up")}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40"
          >
            Up
          </button>

          <button
            type="button"
            disabled={index === editFields.length - 1}
            onClick={() => moveEditField(index, "down")}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40"
          >
            Down
          </button>

          <button
            type="button"
            onClick={() => removeEditField(field.fieldKey)}
            className="rounded-lg border border-red-800 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-950"
          >
            Remove
          </button>
        </div>
      </div>
    ))}
  </div>
</div>

    <div className="mt-4 flex gap-2">
      <button
        type="button"
        onClick={saveTemplateChanges}
        disabled={isUpdating}
        className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUpdating ? "Saving..." : "Save Changes"}
      </button>

      <button
        type="button"
        onClick={() => setEditingTemplate(null)}
        className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
      >
        Cancel
      </button>
    </div>
  </section>
)}

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-white">
            Create Completion Template
          </h2>

          <form onSubmit={handleCreateTemplate} className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Company *
                </span>
                <select
                  value={companyId}
                  onChange={(e) => {
                    setCompanyId(e.target.value);
                    setProjectId("");
                    setServiceTypeId("");
                    setDeviceTypeId("");
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                >
                  <option value="">Select company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name || "Unnamed Company"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Project *
                </span>
                <select
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    setDeviceTypeId("");
                  }}
                  disabled={!companyId}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {companyId ? "Select project" : "Select company first"}
                  </option>
                  {filteredProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name || "Unnamed Project"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Service Type *
                </span>
                <select
                  value={serviceTypeId}
                  onChange={(e) => setServiceTypeId(e.target.value)}
                  disabled={!companyId}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {companyId ? "Select service type" : "Select company first"}
                  </option>
                  {filteredServiceTypes.map((serviceType) => (
                    <option key={serviceType.id} value={serviceType.id}>
                      {serviceType.name || "Unnamed Service Type"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Device Type *
                </span>
                <select
                  value={deviceTypeId}
                  onChange={(e) => setDeviceTypeId(e.target.value)}
                  disabled={!companyId || !projectId}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {projectId ? "Select device type" : "Select project first"}
                  </option>
                  {filteredDeviceTypes.map((deviceType) => (
                    <option key={deviceType.id} value={deviceType.id}>
                      {deviceType.name || "Unnamed Device Type"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Template Name *
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  placeholder="Example: BGE PeakRewards X2S Install"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-300">
                  Description
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  placeholder="Optional instructions or notes for this completion form"
                />
              </label>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
              <h3 className="text-sm font-semibold text-white">
                Add Form Field
              </h3>

              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-slate-300">
                    Field Label
                  </span>
                  <input
                    value={fieldLabel}
                    onChange={(e) => setFieldLabel(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    placeholder="Example: Device Serial Number"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Field Type
                  </span>
                  <select
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  >
                    {fieldTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-end gap-2">
                  <input
                    type="checkbox"
                    checked={fieldRequired}
                    onChange={(e) => setFieldRequired(e.target.checked)}
                    className="mb-3"
                  />
                  <span className="mb-2 text-sm font-medium text-slate-300">
                    Required
                  </span>
                </label>

                {fieldType === "select" && (
                  <label className="block md:col-span-4">
                    <span className="text-sm font-medium text-slate-300">
                      Options
                    </span>
                    <input
                      value={fieldOptions}
                      onChange={(e) => setFieldOptions(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                      placeholder="Example: Yes, No, N/A"
                    />
                  </label>
                )}
              </div>

              <button
                type="button"
                onClick={addField}
                className="mt-4 rounded-lg border border-cyan-700 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-slate-800"
              >
                Add Field
              </button>
            </div>

            {fields.length > 0 && (
              <div className="rounded-lg border border-slate-700">
                <div className="border-b border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-300">
                  Fields on this template
                </div>

                <div className="divide-y divide-slate-700">
                  {fields.map((field) => (
                    <div
                      key={field.fieldKey}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div>
                        <div className="font-medium text-white">
                          {field.order}. {field.label}
                        </div>
                        <div className="text-xs text-slate-400">
                          {field.type} · {field.required ? "Required" : "Optional"}
                          {field.options.length > 0
                            ? ` · Options: ${field.options.join(", ")}`
                            : ""}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeField(field.fieldKey)}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Create Completion Template"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Completion Template Profiles
            </h2>

            <button
              onClick={loadData}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-slate-400">
              Loading completion templates...
            </p>
          ) : templates.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              No completion templates have been created yet.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800 text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-medium">Template</th>
                    <th className="px-4 py-3 font-medium">Project</th>
                    <th className="px-4 py-3 font-medium">Service Type</th>
                    <th className="px-4 py-3 font-medium">Device Type</th>
                    <th className="px-4 py-3 font-medium">Fields</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-700">
                  {templates.map((template) => (
                    <tr key={template.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">
                          {template.name || "Unnamed Template"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {template.companyName || ""}
                        </div>
                        {template.description && (
                          <div className="mt-1 text-xs text-slate-500">
                            {template.description}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {template.projectName || "—"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {template.serviceTypeName || "—"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {template.deviceTypeName || "—"}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {template.fields?.length || 0}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            template.isActive
                              ? "bg-cyan-900 text-cyan-300"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {template.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openEditTemplate(template)}
                            className="rounded-lg border border-cyan-700 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-slate-800"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => duplicateTemplate(template)}
                            className="rounded-lg border border-blue-700 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-slate-800"
                          >
                            Duplicate
                          </button>

                          <button
                            onClick={() => toggleTemplateStatus(template)}
                            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                          >
                            {template.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
