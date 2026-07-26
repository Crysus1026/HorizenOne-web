"use client";

import { useUserProfile } from "@/hooks/useUserProfile";
import Link from "next/link";

import { useProfileById } from "../hooks/useProfileById";
import { canEditSelectedUserProfile } from "../utils/userProfilePermissions";

import { UserProfileEditForm } from "./UserProfileEditForm";

type AuthorizedUserProfileEditPageProps = {
  userId: string;
};

export function AuthorizedUserProfileEditPage({
  userId,
}: AuthorizedUserProfileEditPageProps) {
  const {
    profile: viewerProfile,
    isLoadingProfile: isLoadingViewer,
    profileError: viewerError,
  } = useUserProfile();

  const {
    profile: selectedProfile,
    loading: isLoadingSelected,
    error: selectedError,
  } = useProfileById(userId);

  if (isLoadingViewer || isLoadingSelected) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
        Loading profile editor...
      </div>
    );
  }

  if (
    viewerError ||
    selectedError ||
    !viewerProfile ||
    !selectedProfile
  ) {
    return (
      <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-6">
        <h1 className="text-xl font-semibold text-red-300">
          Unable to edit profile
        </h1>

        <p className="mt-2 text-sm text-red-200">
          {viewerError ||
            selectedError ||
            "The user profile could not be loaded."}
        </p>

        <Link
          href="/admin/users"
          className="mt-5 inline-flex rounded-lg border border-red-800 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-900/40"
        >
          Return to User Management
        </Link>
      </div>
    );
  }

  const canEdit = canEditSelectedUserProfile(
    viewerProfile,
    selectedProfile
  );

  if (!canEdit) {
    return (
      <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-6">
        <h1 className="text-xl font-semibold text-amber-300">
          Access denied
        </h1>

        <p className="mt-2 text-sm text-amber-200">
          You do not have permission to edit this profile.
        </p>

        <Link
          href={`/users/${selectedProfile.uid}`}
          className="mt-5 inline-flex rounded-lg border border-amber-800 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-900/40"
        >
          Return to Profile
        </Link>
      </div>
    );
  }

  const fullName =
    `${selectedProfile.firstName} ${selectedProfile.lastName}`.trim() ||
    selectedProfile.email ||
    "User Profile";

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/admin/users"
            className="text-cyan-300 transition hover:text-cyan-200"
          >
            User Management
          </Link>

          <span className="text-slate-600">/</span>

          <Link
            href={`/users/${selectedProfile.uid}`}
            className="text-cyan-300 transition hover:text-cyan-200"
          >
            {fullName}
          </Link>

          <span className="text-slate-600">/</span>

          <span className="text-slate-400">
            Edit
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-bold text-white">
          Edit User Profile
        </h1>

        <p className="mt-2 text-slate-400">
          Update profile information, account access, and program assignments.
        </p>
      </div>

      <UserProfileEditForm
        viewerProfile={viewerProfile}
        selectedProfile={selectedProfile}
      />
    </div>
  );
}