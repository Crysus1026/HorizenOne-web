"use client";

import { useUserProfile } from "@/hooks/useUserProfile";

import { UserProfileError } from "@/features/users/components/UserProfileError";
import { UserProfileLoading } from "@/features/users/components/UserProfileLoading";
import { UserProfileShell } from "@/features/users/components/UserProfileShell";

export default function ProfilePage() {
  const {
    authUser,
    profile,
    isLoadingProfile,
    profileError,
  } = useUserProfile();

  if (isLoadingProfile) {
    return <UserProfileLoading />;
  }

  if (profileError) {
    return (
      <UserProfileError message={profileError} />
    );
  }

  if (!authUser || !profile) {
    return (
      <UserProfileError message="You must be signed in to view your profile." />
    );
  }

  return <UserProfileShell profile={profile} />;
}