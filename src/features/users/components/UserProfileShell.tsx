"use client";

import type { UserProfile } from "@/hooks/useUserProfile";

import { UserOverview } from "./UserOverview";
import { UserProfileHeader } from "./UserProfileHeader";

type UserProfileShellProps = {
  profile: UserProfile;
};

export function UserProfileShell({
  profile,
}: UserProfileShellProps) {
  return (
    <div className="space-y-6">
      <UserProfileHeader profile={profile} />

      <UserOverview profile={profile} />
    </div>
  );
}