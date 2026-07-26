import { db } from "@/lib/firebase";

import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import type {
  UpdateEmploymentInformationInput,
  UpdatePersonalInformationInput,
  UserProfile,
} from "../types/userProfile";

import { normalizeUserProfile } from "../utils/normalizeUserProfile";

export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  if (!userId) {
    return null;
  }

  const userRef = doc(db, "users", userId);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeUserProfile(
    snapshot.id,
    snapshot.data()
  );
}

export async function updatePersonalInformation(
  userId: string,
  input: UpdatePersonalInformationInput
): Promise<void> {
  if (!userId) {
    throw new Error("A user ID is required.");
  }

  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    preferredName: input.preferredName.trim(),
    phone: input.phone.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateEmploymentInformation(
  userId: string,
  input: UpdateEmploymentInformationInput
): Promise<void> {
  if (!userId) {
    throw new Error("A user ID is required.");
  }

  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, {
    employeeId: input.employeeId.trim(),
    jobTitle: input.jobTitle.trim(),
    department: input.department.trim(),
    managerUserId: input.managerUserId.trim(),
    hireDate: input.hireDate,
    updatedAt: serverTimestamp(),
  });
}