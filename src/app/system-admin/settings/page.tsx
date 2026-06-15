"use client";

import AppShell from "@/components/AppShell";
import { auth, db } from "@/lib/firebase";
import { getUserProfile } from "@/lib/getUserProfile";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SystemSettings = {
  platformName?: string;
  supportEmail?: string;
  supportPhone?: string;
  defaultTimeZone?: string;
  defaultDateFormat?: string;
  defaultTimeFormat?: string;

  workOrderPrefix?: string;
  autoGenerateWorkOrderNumbers?: boolean;
  defaultWorkOrderStatus?: string;
  defaultCompletionStatus?: string;
  defaultSchedulingWindowMinutes?: number;

  requireCompletionForm?: boolean;
  requireCompletionPhotos?: boolean;
  requireSignature?: boolean;
  requireTechnicianNotes?: boolean;
  allowTechnicianReassignment?: boolean;

  maxPhotoUploadMb?: number;
  allowedFileTypes?: string;
  auditLoggingEnabled?: boolean;
  auditRetentionDays?: number;
};

export default function SystemAdminSettingsPage() {
  const router = useRouter();

  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [platformName, setPlatformName] = useState("HorizenOne");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [defaultTimeZone, setDefaultTimeZone] = useState("America/New_York");
  const [defaultDateFormat, setDefaultDateFormat] = useState("MM/DD/YYYY");
  const [defaultTimeFormat, setDefaultTimeFormat] = useState("12-hour");

  const [workOrderPrefix, setWorkOrderPrefix] = useState("WO-");
  const [autoGenerateWorkOrderNumbers, setAutoGenerateWorkOrderNumbers] =
    useState(true);
  const [defaultWorkOrderStatus, setDefaultWorkOrderStatus] =
    useState("Scheduled");
  const [defaultCompletionStatus, setDefaultCompletionStatus] =
    useState("Completed");
  const [defaultSchedulingWindowMinutes, setDefaultSchedulingWindowMinutes] =
    useState("120");

  const [requireCompletionForm, setRequireCompletionForm] = useState(true);
  const [requireCompletionPhotos, setRequireCompletionPhotos] = useState(false);
  const [requireSignature, setRequireSignature] = useState(false);
  const [requireTechnicianNotes, setRequireTechnicianNotes] = useState(false);
  const [allowTechnicianReassignment, setAllowTechnicianReassignment] =
    useState(false);

  const [maxPhotoUploadMb, setMaxPhotoUploadMb] = useState("10");
  const [allowedFileTypes, setAllowedFileTypes] = useState(
    "jpg,jpeg,png,heic,pdf"
  );
  const [auditLoggingEnabled, setAuditLoggingEnabled] = useState(true);
  const [auditRetentionDays, setAuditRetentionDays] = useState("2555");

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
      await loadSettings();
    });

    return () => unsubscribe();
  }, [router]);

  async function loadSettings() {
    setIsLoading(true);
    setError("");

    try {
      const settingsRef = doc(db, "systemSettings", "global");
      const settingsSnap = await getDoc(settingsRef);

      if (!settingsSnap.exists()) {
        setIsLoading(false);
        return;
      }

      const data = settingsSnap.data() as SystemSettings;

      setPlatformName(data.platformName || "HorizenOne");
      setSupportEmail(data.supportEmail || "");
      setSupportPhone(data.supportPhone || "");
      setDefaultTimeZone(data.defaultTimeZone || "America/New_York");
      setDefaultDateFormat(data.defaultDateFormat || "MM/DD/YYYY");
      setDefaultTimeFormat(data.defaultTimeFormat || "12-hour");

      setWorkOrderPrefix(data.workOrderPrefix || "WO-");
      setAutoGenerateWorkOrderNumbers(
        data.autoGenerateWorkOrderNumbers ?? true
      );
      setDefaultWorkOrderStatus(data.defaultWorkOrderStatus || "Scheduled");
      setDefaultCompletionStatus(data.defaultCompletionStatus || "Completed");
      setDefaultSchedulingWindowMinutes(
        String(data.defaultSchedulingWindowMinutes || 120)
      );

      setRequireCompletionForm(data.requireCompletionForm ?? true);
      setRequireCompletionPhotos(data.requireCompletionPhotos ?? false);
      setRequireSignature(data.requireSignature ?? false);
      setRequireTechnicianNotes(data.requireTechnicianNotes ?? false);
      setAllowTechnicianReassignment(
        data.allowTechnicianReassignment ?? false
      );

      setMaxPhotoUploadMb(String(data.maxPhotoUploadMb || 10));
      setAllowedFileTypes(data.allowedFileTypes || "jpg,jpeg,png,heic,pdf");
      setAuditLoggingEnabled(data.auditLoggingEnabled ?? true);
      setAuditRetentionDays(String(data.auditRetentionDays || 2555));
    } catch (err) {
      console.error(err);
      setError("Unable to load system settings.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const schedulingMinutes = Number(defaultSchedulingWindowMinutes);
    const maxUploadMb = Number(maxPhotoUploadMb);
    const retentionDays = Number(auditRetentionDays);

    if (!platformName.trim()) {
      setError("Platform name is required.");
      return;
    }

    if (Number.isNaN(schedulingMinutes) || schedulingMinutes <= 0) {
      setError("Default scheduling window must be a positive number.");
      return;
    }

    if (Number.isNaN(maxUploadMb) || maxUploadMb <= 0) {
      setError("Max photo upload size must be a positive number.");
      return;
    }

    if (Number.isNaN(retentionDays) || retentionDays <= 0) {
      setError("Audit retention days must be a positive number.");
      return;
    }

    setIsSaving(true);

    try {
      await setDoc(
        doc(db, "systemSettings", "global"),
        {
          platformName: platformName.trim(),
          supportEmail: supportEmail.trim(),
          supportPhone: supportPhone.trim(),
          defaultTimeZone,
          defaultDateFormat,
          defaultTimeFormat,

          workOrderPrefix: workOrderPrefix.trim(),
          autoGenerateWorkOrderNumbers,
          defaultWorkOrderStatus,
          defaultCompletionStatus,
          defaultSchedulingWindowMinutes: schedulingMinutes,

          requireCompletionForm,
          requireCompletionPhotos,
          requireSignature,
          requireTechnicianNotes,
          allowTechnicianReassignment,

          maxPhotoUploadMb: maxUploadMb,
          allowedFileTypes: allowedFileTypes.trim(),
          auditLoggingEnabled,
          auditRetentionDays: retentionDays,

          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSuccessMessage("System settings saved.");
    } catch (err) {
      console.error(err);
      setError("Unable to save system settings.");
    } finally {
      setIsSaving(false);
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
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage global HorizenOne settings used across companies, work
            orders, technician closeout, files, and audit logging.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="rounded-lg border border-cyan-800 bg-cyan-950 p-3 text-sm text-cyan-300">
            {successMessage}
          </div>
        )}

        {isLoading ? (
          <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
            <p className="text-sm text-slate-400">Loading settings...</p>
          </section>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-white">
                Platform Settings
              </h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Platform Name *
                  </span>
                  <input
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Support Email
                  </span>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    placeholder="support@horizenone.com"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Support Phone
                  </span>
                  <input
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Default Time Zone
                  </span>
                  <input
                    value={defaultTimeZone}
                    onChange={(e) => setDefaultTimeZone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    placeholder="America/New_York"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Date Format
                  </span>
                  <select
                    value={defaultDateFormat}
                    onChange={(e) => setDefaultDateFormat(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Time Format
                  </span>
                  <select
                    value={defaultTimeFormat}
                    onChange={(e) => setDefaultTimeFormat(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  >
                    <option value="12-hour">12-hour</option>
                    <option value="24-hour">24-hour</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-white">
                Work Order Settings
              </h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Work Order Prefix
                  </span>
                  <input
                    value={workOrderPrefix}
                    onChange={(e) => setWorkOrderPrefix(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    placeholder="WO-"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Default Scheduling Window Minutes
                  </span>
                  <input
                    type="number"
                    value={defaultSchedulingWindowMinutes}
                    onChange={(e) =>
                      setDefaultSchedulingWindowMinutes(e.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Default Work Order Status
                  </span>
                  <select
                    value={defaultWorkOrderStatus}
                    onChange={(e) =>
                      setDefaultWorkOrderStatus(e.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Assigned">Assigned</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Default Completion Status
                  </span>
                  <select
                    value={defaultCompletionStatus}
                    onChange={(e) =>
                      setDefaultCompletionStatus(e.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  >
                    <option value="Completed">Completed</option>
                    <option value="Verified">Verified</option>
                  </select>
                </label>

                <label className="flex items-center gap-2 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={autoGenerateWorkOrderNumbers}
                    onChange={(e) =>
                      setAutoGenerateWorkOrderNumbers(e.target.checked)
                    }
                  />
                  <span className="text-sm font-medium text-slate-300">
                    Auto-generate work order numbers
                  </span>
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-white">
                Technician Completion Settings
              </h2>

              <div className="mt-4 grid gap-3">
                <CheckboxRow
                  label="Require completion form"
                  checked={requireCompletionForm}
                  onChange={setRequireCompletionForm}
                />
                <CheckboxRow
                  label="Require completion photos"
                  checked={requireCompletionPhotos}
                  onChange={setRequireCompletionPhotos}
                />
                <CheckboxRow
                  label="Require customer/technician signature"
                  checked={requireSignature}
                  onChange={setRequireSignature}
                />
                <CheckboxRow
                  label="Require technician notes"
                  checked={requireTechnicianNotes}
                  onChange={setRequireTechnicianNotes}
                />
                <CheckboxRow
                  label="Allow technicians to reassign jobs"
                  checked={allowTechnicianReassignment}
                  onChange={setAllowTechnicianReassignment}
                />
              </div>
            </section>

            <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-white">
                Files & Audit Settings
              </h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Max Photo Upload Size MB
                  </span>
                  <input
                    type="number"
                    value={maxPhotoUploadMb}
                    onChange={(e) => setMaxPhotoUploadMb(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Allowed File Types
                  </span>
                  <input
                    value={allowedFileTypes}
                    onChange={(e) => setAllowedFileTypes(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                    placeholder="jpg,jpeg,png,heic,pdf"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-300">
                    Audit Retention Days
                  </span>
                  <input
                    type="number"
                    value={auditRetentionDays}
                    onChange={(e) => setAuditRetentionDays(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  />
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={auditLoggingEnabled}
                    onChange={(e) => setAuditLoggingEnabled(e.target.checked)}
                  />
                  <span className="text-sm font-medium text-slate-300">
                    Enable audit logging
                  </span>
                </label>
              </div>
            </section>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-cyan-600 px-5 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm font-medium text-slate-300">{label}</span>
    </label>
  );
}