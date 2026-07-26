"use client";

import type { UserProfile } from "@/hooks/useUserProfile";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

type UseProfileByIdResult = {
  profile: UserProfile | null;
  loading: boolean;
  error: string;
  refreshProfile: () => Promise<void>;
};

function normalizeUserProfile(
  userId: string,
  data: Record<string, unknown>
): UserProfile {
  return {
    uid: userId,

    email:
      typeof data.email === "string"
        ? data.email
        : "",

    firstName:
      typeof data.firstName === "string"
        ? data.firstName
        : "",

    lastName:
      typeof data.lastName === "string"
        ? data.lastName
        : "",

    role:
      typeof data.role === "string"
        ? data.role
        : "",

    companyId:
      typeof data.companyId === "string"
        ? data.companyId
        : "",

    companyName:
      typeof data.companyName === "string"
        ? data.companyName
        : "",

    isActive: data.isActive === true,

    isSystemAdmin:
      data.isSystemAdmin === true ||
      data.role === "System Admin",

    projectIds: Array.isArray(data.projectIds)
      ? data.projectIds.filter(
          (value): value is string =>
            typeof value === "string"
        )
      : [],
  };
}

export function useProfileById(
  userId: string
): UseProfileByIdResult {
  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setError("A user ID was not provided.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setProfile(null);
        setError("The selected user profile was not found.");
        return;
      }

      const loadedProfile = normalizeUserProfile(
        userSnap.id,
        userSnap.data()
      );

      setProfile(loadedProfile);
    } catch (err) {
      console.error(
        "Unable to load selected user profile:",
        err
      );

      setProfile(null);
      setError(
        "Unable to load the selected user profile."
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  return {
    profile,
    loading,
    error,
    refreshProfile: loadProfile,
  };
}