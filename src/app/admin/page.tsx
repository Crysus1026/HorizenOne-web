import AppShell from "@/components/AppShell";
import Link from "next/link";

export default function AdminPage() {
  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Admin</h1>
          <p className="mt-2 text-slate-400">
            Manage system settings, users, and platform configuration.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/service-types"
            className="rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-cyan-400 hover:bg-slate-800"
          >
            <h2 className="text-xl font-semibold text-white">
              Service Types
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Create and manage available service offerings, default durations,
              and scheduling settings.
            </p>
          </Link>

          <Link
            href="/admin/technicians"
            className="rounded-xl border border-slate-800 bg-slate-900 p-6 hover:border-blue-500"
          >
            <h2 className="text-xl font-semibold">Technicians</h2>
            <p className="mt-2 text-sm text-slate-400">
              Create technicians for dispatch assignment.
            </p>
          </Link>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold text-white">
              User Management
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Manage user accounts, permissions, and role assignments.
            </p>

            <p className="mt-4 text-xs text-slate-500">
              Coming Soon
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold text-white">
              Company Settings
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Configure company information, branding, and system defaults.
            </p>

            <p className="mt-4 text-xs text-slate-500">
              Coming Soon
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}