"use client";

import AppShell from "@/components/AppShell";

export default function ProfilePage() {
  return (
    <AppShell>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-4">
          User Profile
        </h1>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <p className="text-zinc-400">
            Profile settings coming soon.
          </p>
        </div>
      </div>
    </AppShell>
  );
}