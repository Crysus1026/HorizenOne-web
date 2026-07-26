import type {
  DocumentData,
  Timestamp,
} from "firebase/firestore";

import type {
  AppRole,
  UserProfile,
} from "../types/userProfile";

const validRoles: AppRole[] = [
  "System Admin",
  "Admin",
  "Manager",
  "Dispatcher",
  "Technician",
];

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string"
  );
}

function normalizeRole(value: unknown): AppRole {
  if (
    typeof value === "string" &&
    validRoles.includes(value as AppRole)
  ) {
    return value as AppRole;
  }

  return "Technician";
}

function normalizeDate(
  value: unknown
): Date | null {
  if (!value) {
    return null;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as Timestamp).toDate === "function"
  ) {
    return (value as Timestamp).toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  return null;
}

export function normalizeUserProfile(
  id: string,
  data: DocumentData
): UserProfile {
  return {
    id,

    companyId: normalizeString(data.companyId),

    firstName: normalizeString(data.firstName),
    lastName: normalizeString(data.lastName),
    preferredName: normalizeString(
      data.preferredName
    ),

    email: normalizeString(data.email),
    phone: normalizeString(data.phone),

    employeeId: normalizeString(
      data.employeeId
    ),
    jobTitle: normalizeString(data.jobTitle),
    department: normalizeString(
      data.department
    ),
    managerUserId: normalizeString(
      data.managerUserId
    ),
    hireDate: normalizeString(data.hireDate),

    role: normalizeRole(data.role),
    projectIds: normalizeStringArray(
      data.projectIds
    ),

    profilePhotoUrl: normalizeString(
      data.profilePhotoUrl
    ),

    isActive: data.isActive !== false,

    createdAt: normalizeDate(data.createdAt),
    updatedAt: normalizeDate(data.updatedAt),
  };
}