import { db } from "@/lib/firebase";
import {
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

export type UpdateUserProfileInput = {
  firstName: string;
  lastName: string;
  role?: string;
  companyId?: string;
  companyName?: string;
  isActive?: boolean;
  projectIds: string[];
  updatedBy: string;
};

export async function updateUserProfile(
  userId: string,
  input: UpdateUserProfileInput
): Promise<void> {
  if (!userId) {
    throw new Error("A user ID is required.");
  }

  const updateData: Record<string, unknown> = {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    projectIds: input.projectIds,
    updatedBy: input.updatedBy,
    updatedAt: serverTimestamp(),
  };

  if (typeof input.role === "string") {
    updateData.role = input.role;
    updateData.isSystemAdmin =
      input.role === "System Admin";
  }

  if (typeof input.companyId === "string") {
    updateData.companyId = input.companyId;
  }

  if (typeof input.companyName === "string") {
    updateData.companyName = input.companyName;
  }

  if (typeof input.isActive === "boolean") {
    updateData.isActive = input.isActive;
  }

  await updateDoc(
    doc(db, "users", userId),
    updateData
  );
}