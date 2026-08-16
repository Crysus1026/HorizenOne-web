"use client";

import type { UserProfile } from "@/hooks/useUserProfile";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type UseProfileByIdResult = {
  profile: UserProfile | null;
  loading: boolean;
  error: string;
  refreshProfile: () => Promise<void>;
};

type ProfileLoadResult = {
  profile: UserProfile | null;
  error: string;
};

type StoredProfileResult = ProfileLoadResult & {
  userId: string;
};

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []; 
  }

  return value.filter(
    (item): item is string => typeof item === "string"
  );
}

function normalizeUserProfile(
  userId: string,
  data: Record<string, unknown>
): UserProfile {
  const role = readString(data.role);

  return {
    uid: userId,
    email: readString(data.email),
    firstName: readString(data.firstName),
    lastName: readString(data.lastName),
    role,
    companyId: readString(data.companyId),
    companyName: readString(data.companyName),
    isActive: data.isActive === true,
    isSystemAdmin:
      data.isSystemAdmin === true || role === "System Admin",
    projectIds: readStringArray(data.projectIds),
    technicianEnabled:
      role === "Technician" ||
      data.technicianEnabled === true,
    technicianId: readString(data.technicianId),
  };
}

async function fetchProfileById(
  userId: string
): Promise<ProfileLoadResult> {
  try {
    const userRef = doc(db, "users", userId);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
      return {
        profile: null,
        error: "The selected user profile was not found.",
      };
    }

    return {
      profile: normalizeUserProfile(
        userSnapshot.id,
        userSnapshot.data()
      ),
      error: "",
    };
  } catch (error: unknown) {
    console.error(
      "Unable to load selected user profile:",
      error
    );

    return {
      profile: null,
      error: "Unable to load the selected user profile.",
    };
  }
}

export function useProfileById(
  userId: string
): UseProfileByIdResult {
  const [storedResult, setStoredResult] =
    useState<StoredProfileResult>({
      userId: "",
      profile: null,
      error: "",
    });

  const [refreshingUserId, setRefreshingUserId] =
    useState<string | null>(null);

  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    let isCancelled = false;

    async function loadSelectedProfile() {
      const result = await fetchProfileById(userId);

      if (
        isCancelled ||
        latestRequestIdRef.current !== requestId
      ) {
        return;
      }

      setStoredResult({
        userId,
        ...result,
      });
    }

    void loadSelectedProfile();

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setStoredResult({
        userId: "",
        profile: null,
        error: "A user ID was not provided.",
      });

      return;
    }

    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    setRefreshingUserId(userId);

    const result = await fetchProfileById(userId);

    if (latestRequestIdRef.current !== requestId) {
      return;
    }

    setStoredResult({
      userId,
      ...result,
    });

    setRefreshingUserId((currentUserId) =>
      currentUserId === userId ? null : currentUserId
    );
  }, [userId]);

  const resultMatchesCurrentUser =
    storedResult.userId === userId;

  const profile = resultMatchesCurrentUser
    ? storedResult.profile
    : null;

  const error = !userId
    ? "A user ID was not provided."
    : resultMatchesCurrentUser
      ? storedResult.error
      : "";

  const loading =
    Boolean(userId) &&
    (!resultMatchesCurrentUser ||
      refreshingUserId === userId);

  return {
    profile,
    loading,
    error,
    refreshProfile,
  };
}