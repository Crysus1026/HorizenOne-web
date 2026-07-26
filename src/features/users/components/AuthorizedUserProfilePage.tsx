"use client";

import { useUserProfile } from "@/hooks/useUserProfile";
import Link from "next/link";

import { useProfileById } from "../hooks/useProfileById";
import {
  canEditSelectedUserProfile,
  canViewSelectedUserProfile,
} from "../utils/userProfilePermissions";

import { UserProfileError } from "./UserProfileError";
import { UserProfileLoading } from "./UserProfileLoading";
import { UserProfileShell } from "./UserProfileShell";

type AuthorizedUserProfilePageProps = {
  userId: string;
};

export function AuthorizedUserProfilePage({
  userId,
}: AuthorizedUserProfilePageProps) {
  const {
    profile: viewerProfile,
    isLoadingProfile: isLoadingViewer,
    profileError: viewerError,
  } = useUserProfile();

  const {
    profile: selectedProfile,
    loading: isLoadingSelected,
    error: selectedError,
    refreshProfile,
  } = useProfileById(userId);

  if (isLoadingViewer || isLoadingSelected) {
    return <UserProfileLoading />;
  }

  if (viewerError || !viewerProfile) {
    return (
      <UserProfileError
        message={
          viewerError ||
          "Your user profile could not be loaded."
        }
      />
    );
  }

  if (selectedError || !selectedProfile) {
    return (
      <UserProfileError
        message={
          selectedError ||
          "The selected user profile was not found."
        }
        onRetry={refreshProfile}
      />
    );
  }

  const canView = canViewSelectedUserProfile(
    viewerProfile,
    selectedProfile
  );

  if (!canView) {
    return (
      <UserProfileError
        message="You do not have permission to view this user profile."
      />
    );
  }

  const canEdit = canEditSelectedUserProfile(
    viewerProfile,
    selectedProfile
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin/users"
          className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
        >
          ← Back to User Management
        </Link>

        {canEdit ? (
          <Link
            href={`/users/${selectedProfile.uid}/edit`}
            className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Edit Profile
          </Link>
        ) : null}
      </div>

      <UserProfileShell
        profile={selectedProfile}
      />
    </div>
  );
}