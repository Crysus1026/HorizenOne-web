import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type UserProfile = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  companyId?: string;
  role?: string;
  isActive?: boolean;
  isSystemAdmin?: boolean;
};

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  return {
    id: userSnap.id,
    ...(userSnap.data() as Omit<UserProfile, "id">),
  };
}