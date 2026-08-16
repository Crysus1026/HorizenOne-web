import type { UserProfile } from "@/hooks/useUserProfile";

function hasSharedProject(
  viewerProjectIds: string[],
  selectedUserProjectIds: string[]
): boolean {
  if (viewerProjectIds.length === 0) {
    return false;
  }

  return viewerProjectIds.some((projectId) =>
    selectedUserProjectIds.includes(projectId)
  );
}

export function canViewSelectedUserProfile(
  viewer: UserProfile | null,
  selectedUser: UserProfile | null
): boolean {
  if (!viewer || !selectedUser || !viewer.isActive) {
    return false;
  }

  if (viewer.uid === selectedUser.uid) {
    return true;
  }

  if (viewer.isSystemAdmin) {
    return true;
  }

  if (viewer.companyId !== selectedUser.companyId) {
    return false;
  }

  if (viewer.role === "Admin") {
    return true;
  }

  if (viewer.role === "Manager") {
    return hasSharedProject(
      viewer.projectIds,
      selectedUser.projectIds
    );
  }

  return false;
}

export function canEditSelectedUserProfile(
  viewer: UserProfile | null,
  selectedUser: UserProfile | null
): boolean {
  if (!viewer || !selectedUser || !viewer.isActive) {
    return false;
  }

  if (viewer.isSystemAdmin) {
    return true;
  }

  if (viewer.companyId !== selectedUser.companyId) {
    return false;
  }

  if (viewer.role === "Admin") {
    return true;
  }

  if (viewer.role === "Manager") {
    return hasSharedProject(
      viewer.projectIds,
      selectedUser.projectIds
    );
  }

  return false;
}

export function canEditUserAccess(
  viewer: UserProfile | null
): boolean {
  if (!viewer || !viewer.isActive) {
    return false;
  }

  return (
    viewer.isSystemAdmin ||
    viewer.role === "Admin"
  );
}

export function canEditUserCompany(
  viewer: UserProfile | null
): boolean {
  return Boolean(
    viewer &&
      viewer.isActive &&
      viewer.isSystemAdmin
  );
}

export function canPerformFieldWork(
  profile: UserProfile | null
): boolean {
  if (!profile || !profile.isActive) {
    return false;
  }

  return (
    profile.role === "Technician" ||
    profile.technicianEnabled === true
  );
}