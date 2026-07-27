import type { Customer } from "@/types/customer";
import type {
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";

export function mapCustomerDocument(
  document: QueryDocumentSnapshot<DocumentData>
): Customer {
  return {
    id: document.id,
    ...(document.data() as Omit<Customer, "id">),
  };
}