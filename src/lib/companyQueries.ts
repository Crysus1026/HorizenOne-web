import {
  collection,
  getDocs,
  orderBy,
  query,
  QueryConstraint,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function getCompanyCollection<T>(
  collectionName: string,
  companyId: string,
  isSystemAdmin: boolean,
  constraints: QueryConstraint[] = []
): Promise<(T & { id: string })[]> {
  const collectionRef = collection(db, collectionName);

  const scopedQuery = isSystemAdmin
    ? query(collectionRef, ...constraints)
    : query(
        collectionRef,
        where("companyId", "==", companyId),
        ...constraints
      );

  const snapshot = await getDocs(scopedQuery);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as T),
  }));
}