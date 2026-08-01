import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import type { Project } from "../types/project";

export async function getCompanyProjects(
  companyId: string
): Promise<Project[]> {
  if (!companyId) {
    return [];
  }

  const projectsQuery = query(
    collection(db, "projects"),
    where("companyId", "==", companyId),
    orderBy("name", "asc")
  );

  const snapshot = await getDocs(projectsQuery);

  return snapshot.docs.map((document) => {
    const data = document.data();

    return {
      id: document.id,
      companyId: data.companyId ?? "",
      name: data.name ?? "",
      isActive: data.isActive !== false,
    };
  });
}