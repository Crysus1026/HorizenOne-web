"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  QueryConstraint,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/hooks/useUserProfile";

const PROJECT_SCOPED_COLLECTIONS = [
  "workOrders",
  "serviceTypes",
  "deviceTypes",
  "completionFormTemplates",
  "inventoryItems",
  "inventoryUnits",
];

type UseCompanyCollectionOptions = {
  constraints?: QueryConstraint[];
  projectId?: string;
  requireProject?: boolean;
};

export function useCompanyCollection<T>(
  collectionName: string,
  options: UseCompanyCollectionOptions = {}
) {
  const {
    companyId,
    isSystemAdmin,
    isLoadingProfile,
    profileError,
    profile,
  } = useUserProfile();

  const { constraints = [], projectId = "", requireProject = false } = options;

  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const assignedProjectIds = useMemo(() => {
    return Array.isArray(profile?.projectIds) ? profile.projectIds : [];
  }, [profile]);

  useEffect(() => {
    if (isLoadingProfile) return;

    if (profileError) {
      setError(profileError);
      setIsLoading(false);
      return;
    }

    if (!isSystemAdmin && !companyId) {
      setError("User is missing companyId.");
      setIsLoading(false);
      return;
    }

    const isProjectScoped =
      PROJECT_SCOPED_COLLECTIONS.includes(collectionName);

    if (requireProject && !projectId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    if (
      !isSystemAdmin &&
      isProjectScoped &&
      !projectId &&
      assignedProjectIds.length === 0
    ) {
      setData([]);
      setIsLoading(false);
      return;
    }

    async function loadData() {
      setIsLoading(true);
      setError("");

      try {
        const collectionRef = collection(db, collectionName);
        const scopedConstraints: QueryConstraint[] = [];

        if (!isSystemAdmin) {
          scopedConstraints.push(where("companyId", "==", companyId));
        }

        if (isProjectScoped) {
          if (projectId) {
            scopedConstraints.push(where("projectId", "==", projectId));
          } else if (!isSystemAdmin) {
            if (assignedProjectIds.length === 1) {
              scopedConstraints.push(
                where("projectId", "==", assignedProjectIds[0])
              );
            } else {
              scopedConstraints.push(
                where("projectId", "in", assignedProjectIds.slice(0, 10))
              );
            }
          }
        }

        const snapshot = await getDocs(
          query(collectionRef, ...scopedConstraints, ...constraints)
        );

        const loadedData = snapshot.docs.map((document) => ({
          id: document.id,
          ...(document.data() as T),
        }));

        setData(loadedData);
      } catch (err) {
        console.error(err);
        setError(`Unable to load ${collectionName}.`);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [
    collectionName,
    companyId,
    isSystemAdmin,
    isLoadingProfile,
    profileError,
    projectId,
    requireProject,
    assignedProjectIds,
    constraints,
  ]);

  return {
    data,
    isLoading,
    error,
    companyId,
    isSystemAdmin,
    profile,
  };
}