import { db } from "@/lib/firebase";
import type { Customer } from "@/types/customer";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import type { CustomerFormValues } from "../types/customerForm";
import {
  getCustomerNormalizedFields,
  type CustomerNormalizedFields,
} from "../utils/customerNormalization";

export type CustomerRecord = Customer &
  CustomerNormalizedFields & {
    name?: string;
    createdBy?: string;
    updatedBy?: string;
  };

export type DuplicateReason =
  | "account-number"
  | "email"
  | "phone"
  | "name-and-address";

export type DuplicateCustomerMatch = {
  customer: CustomerRecord;
  reasons: DuplicateReason[];
};

function mapCustomerDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>
): CustomerRecord {
  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<CustomerRecord, "id">),
  };
}

export async function getCustomerById(
  customerId: string
): Promise<CustomerRecord | null> {
  const customerRef = doc(db, "customers", customerId);
  const customerSnapshot = await getDoc(customerRef);

  if (!customerSnapshot.exists()) {
    return null;
  }

  return {
    id: customerSnapshot.id,
    ...(customerSnapshot.data() as Omit<
      CustomerRecord,
      "id"
    >),
  };
}

export async function findDuplicateCustomers(
  companyId: string,
  values: CustomerFormValues,
  excludedCustomerId?: string
): Promise<DuplicateCustomerMatch[]> {
  const normalized =
    getCustomerNormalizedFields(values);

  const matches = new Map<
    string,
    DuplicateCustomerMatch
  >();

  function addMatch(
    customer: CustomerRecord,
    reason: DuplicateReason
  ) {
    if (
      excludedCustomerId &&
      customer.id === excludedCustomerId
    ) {
      return;
    }

    const existingMatch = matches.get(customer.id);

    if (existingMatch) {
      if (!existingMatch.reasons.includes(reason)) {
        existingMatch.reasons.push(reason);
      }

      return;
    }

    matches.set(customer.id, {
      customer,
      reasons: [reason],
    });
  }

  const duplicateQueries: Promise<void>[] = [];

  if (normalized.accountNumberNormalized) {
    duplicateQueries.push(
      getDocs(
        query(
          collection(db, "customers"),
          where("companyId", "==", companyId),
          where(
            "accountNumberNormalized",
            "==",
            normalized.accountNumberNormalized
          )
        )
      ).then((snapshot) => {
        snapshot.docs.forEach((document) => {
          addMatch(
            mapCustomerDocument(document),
            "account-number"
          );
        });
      })
    );
  }

  if (normalized.emailNormalized) {
    duplicateQueries.push(
      getDocs(
        query(
          collection(db, "customers"),
          where("companyId", "==", companyId),
          where(
            "emailNormalized",
            "==",
            normalized.emailNormalized
          )
        )
      ).then((snapshot) => {
        snapshot.docs.forEach((document) => {
          addMatch(
            mapCustomerDocument(document),
            "email"
          );
        });
      })
    );
  }

  /*
   * Avoid warning on short or incomplete phone values.
   */
  if (normalized.phoneDigits.length >= 10) {
    duplicateQueries.push(
      getDocs(
        query(
          collection(db, "customers"),
          where("companyId", "==", companyId),
          where(
            "phoneDigits",
            "==",
            normalized.phoneDigits
          )
        )
      ).then((snapshot) => {
        snapshot.docs.forEach((document) => {
          addMatch(
            mapCustomerDocument(document),
            "phone"
          );
        });
      })
    );
  }

  if (
    normalized.customerNameNormalized &&
    normalized.addressNormalized
  ) {
    duplicateQueries.push(
      getDocs(
        query(
          collection(db, "customers"),
          where("companyId", "==", companyId),
          where(
            "customerNameNormalized",
            "==",
            normalized.customerNameNormalized
          )
        )
      ).then((snapshot) => {
        snapshot.docs.forEach((document) => {
          const customer =
            mapCustomerDocument(document);

          if (
            customer.addressNormalized ===
            normalized.addressNormalized
          ) {
            addMatch(
              customer,
              "name-and-address"
            );
          }
        });
      })
    );
  }

  await Promise.all(duplicateQueries);

  return Array.from(matches.values()).slice(0, 10);
}

export async function createCustomer(
  companyId: string,
  userId: string,
  values: CustomerFormValues
): Promise<string> {
  const normalized =
    getCustomerNormalizedFields(values);

  const customerDocument = await addDoc(
    collection(db, "customers"),
    {
      companyId,

      customerName: values.customerName,
      accountNumber: values.accountNumber,
      address: values.address,
      city: values.city,
      state: values.state,
      zip: values.zip,
      phone: values.phone,
      email: values.email,
      notes: values.notes,
      isActive: true,

      ...normalized,

      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    }
  );

  return customerDocument.id;
}

export async function updateCustomer(
  customerId: string,
  userId: string,
  values: CustomerFormValues
): Promise<void> {
  const customerRef = doc(
    db,
    "customers",
    customerId
  );

  const normalized =
    getCustomerNormalizedFields(values);

  await updateDoc(customerRef, {
    customerName: values.customerName,
    accountNumber: values.accountNumber,
    address: values.address,
    city: values.city,
    state: values.state,
    zip: values.zip,
    phone: values.phone,
    email: values.email,
    notes: values.notes,
    isActive: values.isActive,

    ...normalized,

    updatedAt: serverTimestamp(),
    updatedBy: userId,
  });
}