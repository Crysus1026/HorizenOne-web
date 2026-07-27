"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  getDocs,
  query,
  type QueryConstraint,
  where,
} from "firebase/firestore";

import { useUserProfile } from "@/hooks/useUserProfile";
import { db } from "@/lib/firebase";

const PROJECT_SCOPED_COLLECTIONS = new Set([
  "workOrders",
  "serviceTypes",
  "deviceTypes",
  "completionFormTemplates",
  "inventoryItems",
  "inventoryUnits",
]);

const PROJECT_QUERY_BATCH_SIZE = 10;

type UseCompanyCollectionOptions = {
  constraints?: QueryConstraint[];
  projectId?: string;
  requireProject?: boolean;
};

type CollectionRecord<T> = T & {
  id: string;
};

type CollectionLoadResult<T> = {
  requestKey: string;
  data: CollectionRecord<T>[];
  error: string;
};

type CollectionValidationResult =
  | {
      canLoad: true;
      error: "";
    }
  | {
      canLoad: false;
      error: string;
    };

function splitIntoBatches<T>(
  values: T[],
  batchSize: number
): T[][] {
  const batches: T[][] = [];

  for (
    let index = 0;
    index < values.length;
    index += batchSize
  ) {
    batches.push(values.slice(index, index + batchSize));
  }

  return batches;
}

function removeDuplicateRecords<T>(
  records: CollectionRecord<T>[]
): CollectionRecord<T>[] {
  const recordsById = new Map<string, CollectionRecord<T>>();

  for (const record of records) {
    recordsById.set(record.id, record);
  }

  return Array.from(recordsById.values());
}

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

  const {
    constraints = [],
    projectId = "",
    requireProject = false,
  } = options;

  const latestRequestIdRef = useRef(0);

  const [storedResult, setStoredResult] = useState<
    CollectionLoadResult<T>
  >({
    requestKey: "",
    data: [],
    error: "",
  });

  const assignedProjectIds = useMemo(() => {
    if (!Array.isArray(profile?.projectIds)) {
      return [];
    }

    return profile.projectIds.filter(
      (assignedProjectId): assignedProjectId is string =>
        typeof assignedProjectId === "string" &&
        assignedProjectId.length > 0
    );
  }, [profile?.projectIds]);

  const isProjectScoped =
    PROJECT_SCOPED_COLLECTIONS.has(collectionName);

  const validation = useMemo<CollectionValidationResult>(() => {
    if (isLoadingProfile) {
      return {
        canLoad: false,
        error: "",
      };
    }

    if (profileError) {
      return {
        canLoad: false,
        error: profileError,
      };
    }

    if (!isSystemAdmin && !companyId) {
      return {
        canLoad: false,
        error: "User is missing companyId.",
      };
    }

    if (requireProject && !projectId) {
      return {
        canLoad: false,
        error: "",
      };
    }

    if (
      !isSystemAdmin &&
      isProjectScoped &&
      !projectId &&
      assignedProjectIds.length === 0
    ) {
      return {
        canLoad: false,
        error: "",
      };
    }

    return {
      canLoad: true,
      error: "",
    };
  }, [
    assignedProjectIds.length,
    companyId,
    isLoadingProfile,
    isProjectScoped,
    isSystemAdmin,
    profileError,
    projectId,
    requireProject,
  ]);

  const requestKey = useMemo(() => {
    if (!validation.canLoad) {
      return "";
    }

    return [
      collectionName,
      companyId,
      isSystemAdmin ? "system-admin" : "company-user",
      projectId,
      requireProject ? "project-required" : "project-optional",
      assignedProjectIds.join(","),
    ].join("|");
  }, [
    assignedProjectIds,
    collectionName,
    companyId,
    isSystemAdmin,
    projectId,
    requireProject,
    validation.canLoad,
  ]);

  useEffect(() => {
    if (!validation.canLoad || !requestKey) {
      return;
    }

    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    let isCancelled = false;

    async function loadData() {
      try {
        const collectionRef = collection(db, collectionName);

        const baseConstraints: QueryConstraint[] = [];

        if (!isSystemAdmin) {
          baseConstraints.push(
            where("companyId", "==", companyId)
          );
        }

        if (isProjectScoped && projectId) {
          baseConstraints.push(
            where("projectId", "==", projectId)
          );
        }

        let loadedRecords: CollectionRecord<T>[] = [];

        const shouldQueryAssignedProjects =
          isProjectScoped &&
          !projectId &&
          !isSystemAdmin &&
          assignedProjectIds.length > 0;

        if (shouldQueryAssignedProjects) {
          const projectIdBatches = splitIntoBatches(
            assignedProjectIds,
            PROJECT_QUERY_BATCH_SIZE
          );

          const snapshots = await Promise.all(
            projectIdBatches.map((projectIdBatch) =>
              getDocs(
                query(
                  collectionRef,
                  ...baseConstraints,
                  where("projectId", "in", projectIdBatch),
                  ...constraints
                )
              )
            )
          );

          loadedRecords = snapshots.flatMap((snapshot) =>
            snapshot.docs.map((document) => ({
              id: document.id,
              ...(document.data() as T),
            }))
          );
        } else {
          const snapshot = await getDocs(
            query(
              collectionRef,
              ...baseConstraints,
              ...constraints
            )
          );

          loadedRecords = snapshot.docs.map((document) => ({
            id: document.id,
            ...(document.data() as T),
          }));
        }

        if (
          isCancelled ||
          latestRequestIdRef.current !== requestId
        ) {
          return;
        }

        setStoredResult({
          requestKey,
          data: removeDuplicateRecords(loadedRecords),
          error: "",
        });
      } catch (error: unknown) {
        console.error(
          `Unable to load ${collectionName}:`,
          error
        );

        if (
          isCancelled ||
          latestRequestIdRef.current !== requestId
        ) {
          return;
        }

        setStoredResult({
          requestKey,
          data: [],
          error: `Unable to load ${collectionName}.`,
        });
      }
    }

    void loadData();

    return () => {
      isCancelled = true;
    };
  }, [
    assignedProjectIds,
    collectionName,
    companyId,
    constraints,
    isProjectScoped,
    isSystemAdmin,
    projectId,
    requestKey,
    validation.canLoad,
  ]);

  const resultMatchesCurrentRequest =
    validation.canLoad &&
    storedResult.requestKey === requestKey;

  const data = resultMatchesCurrentRequest
    ? storedResult.data
    : [];

  const error = validation.error
    ? validation.error
    : resultMatchesCurrentRequest
      ? storedResult.error
      : "";

  const isLoading =
    isLoadingProfile ||
    (validation.canLoad && !resultMatchesCurrentRequest);

  return {
    data,
    isLoading,
    error,
    companyId,
    isSystemAdmin,
    profile,
  };
}