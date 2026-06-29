"use client";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

export type UserProfile = {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string;
  companyName: string;
  isActive: boolean;
  isSystemAdmin: boolean;
  projectIds: string[];
};

export function useUserProfile() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [companyId, setCompanyId] = useState("");
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoadingProfile(true);
      setProfileError("");

      try {
        if (!user) {
          setAuthUser(null);
          setProfile(null);
          setCompanyId("");
          setIsSystemAdmin(false);
          return;
        }

        setAuthUser(user);

        const userSnap = await getDoc(doc(db, "users", user.uid));

        if (!userSnap.exists()) {
          throw new Error("User profile not found.");
        }

        const userData = userSnap.data();

        if (userData.isActive !== true) {
          throw new Error("User account is inactive.");
        }

        const loadedProfile: UserProfile = {
          uid: user.uid,
          email: user.email || userData.email || "",
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          role: userData.role || "",
          companyId: userData.companyId || "",
          companyName: userData.companyName || "",
          isActive: userData.isActive === true,
          isSystemAdmin:
            userData.isSystemAdmin === true || userData.role === "System Admin",
          projectIds: Array.isArray(userData.projectIds)
            ? userData.projectIds
            : [],
        };

        setProfile(loadedProfile);
        setCompanyId(loadedProfile.companyId);
        setIsSystemAdmin(loadedProfile.isSystemAdmin);
      } catch (err) {
        console.error(err);
        setAuthUser(user);
        setProfile(null);
        setCompanyId("");
        setIsSystemAdmin(false);
        setProfileError("Unable to load user profile.");
      } finally {
        setIsLoadingProfile(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return {
    authUser,
    profile,
    companyId,
    isSystemAdmin,
    isLoadingProfile,
    profileError,
    hasAssignedProjects: (profile?.projectIds?.length ?? 0) > 0,
  };
}