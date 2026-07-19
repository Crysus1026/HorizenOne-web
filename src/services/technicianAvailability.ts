import { auth, db } from "@/lib/firebase";
import {
  DEFAULT_WEEKDAY_SCHEDULE,
  type TechnicianAvailability,
  type TechnicianAvailabilityException,
  type TechnicianWeeklySchedule,
} from "@/types/technicianAvailability";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

export type SaveTechnicianAvailabilityInput = {
  companyId: string;
  technicianId: string;
  technicianName: string;
  projectIds: string[];
  timezone?: string;
  weeklySchedule: TechnicianWeeklySchedule;
};

export type SaveAvailabilityExceptionInput = {
  companyId: string;
  technicianId: string;
  date: string;
  unavailableWindows: TechnicianAvailabilityException["unavailableWindows"];
  reason: string;
};

function availabilityDocumentId(
  companyId: string,
  technicianId: string,
): string {
  return `${companyId}_${technicianId}`;
}

export async function getTechnicianAvailability(
  companyId: string,
  technicianId: string,
): Promise<TechnicianAvailability | null> {
  const documentId = availabilityDocumentId(companyId, technicianId);

  const snapshot = await getDoc(
    doc(db, "technicianAvailability", documentId),
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as TechnicianAvailability;
}

export async function saveTechnicianAvailability(
  input: SaveTechnicianAvailabilityInput,
): Promise<void> {
  const documentId = availabilityDocumentId(
    input.companyId,
    input.technicianId,
  );

  const reference = doc(
    db,
    "technicianAvailability",
    documentId,
  );

  const existingSnapshot = await getDoc(reference);

  await setDoc(
    reference,
    {
      companyId: input.companyId,
      technicianId: input.technicianId,
      technicianName: input.technicianName,
      projectIds: input.projectIds,
      timezone: input.timezone ?? "America/New_York",
      weeklySchedule: input.weeklySchedule,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid ?? "",
      ...(!existingSnapshot.exists()
        ? {
            createdAt: serverTimestamp(),
          }
        : {}),
    },
    {
      merge: true,
    },
  );
}

export async function createDefaultTechnicianAvailability(
  input: Omit<
    SaveTechnicianAvailabilityInput,
    "weeklySchedule"
  >,
): Promise<void> {
  await saveTechnicianAvailability({
    ...input,
    weeklySchedule: DEFAULT_WEEKDAY_SCHEDULE,
  });
}

export async function getTechnicianAvailabilityExceptions(
  companyId: string,
  technicianId: string,
): Promise<TechnicianAvailabilityException[]> {
  const exceptionsQuery = query(
    collection(db, "technicianAvailabilityExceptions"),
    where("companyId", "==", companyId),
    where("technicianId", "==", technicianId),
  );

  const snapshot = await getDocs(exceptionsQuery);

  return snapshot.docs.map((exceptionDocument) => ({
    id: exceptionDocument.id,
    ...exceptionDocument.data(),
  })) as TechnicianAvailabilityException[];
}

export async function saveTechnicianAvailabilityException(
  input: SaveAvailabilityExceptionInput,
): Promise<void> {
  const documentId = `${input.companyId}_${input.technicianId}_${input.date}`;

  await setDoc(
    doc(
      db,
      "technicianAvailabilityExceptions",
      documentId,
    ),
    {
      companyId: input.companyId,
      technicianId: input.technicianId,
      date: input.date,
      unavailableWindows: input.unavailableWindows,
      reason: input.reason.trim(),
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid ?? "",
      createdAt: serverTimestamp(),
    },
    {
      merge: true,
    },
  );
}

export async function deleteTechnicianAvailabilityException(
  exceptionId: string,
): Promise<void> {
  await deleteDoc(
    doc(
      db,
      "technicianAvailabilityExceptions",
      exceptionId,
    ),
  );
}