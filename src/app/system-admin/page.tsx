"use client";

import AppShell from "@/components/AppShell";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getUserProfile, UserProfile } from "@/lib/getUserProfile";

export default function SystemAdminPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      const userProfile = await getUserProfile(user.uid);

      if (!userProfile?.isSystemAdmin) {
        router.push("/dashboard");
        return;
      }

      setProfile(userProfile);
      setIsCheckingAccess(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (isCheckingAccess) {
    return (
      <AppShell>
        <p className="text-sm text-slate-500">Checking access...</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-12 pl-6 pr-4">
        <div>
          <h1 className="mt-8 gap-6 text-2xl font-bold text-blue-600">
            System Administration
          </h1>
          <p className="mt-1 text-sm text-white">
            Manage HorizenOne system-level records, companies, projects, device types, and technician completion templates.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SystemAdminCard
            title="Companies"
            description="Manage company accounts and tenant setup."
            href="/system-admin/companies"
          />

          <SystemAdminCard
            title="Projects"
            description="Manage utility programs and project records."
            href="/system-admin/projects"
          />

          <SystemAdminCard
            title="Device Types"
            description="Manage thermostat, switch, and device catalogs."
            href="/system-admin/device-types"
          />

          <SystemAdminCard
            title="Completion Templates"
            description="Manage technician closeout forms by project, service type, and device type."
            href="/system-admin/completion-templates"
          />

          <SystemAdminCard
            title="Users"
            description="View users, roles, company access, and system access."
            href="/system-admin/users"
          />

          <SystemAdminCard
            title="Settings"
            description="Manage system-wide application settings."
            href="/system-admin/settings"
          />
        </div>
      </div>
    </AppShell>
  );
}

function SystemAdminCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-sm transition hover:border-blue-600 hover:bg-slate-800 hover:shadow-md"
    >
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </Link>
  );
}