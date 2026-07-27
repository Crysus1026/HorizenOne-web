import type { Timestamp } from "firebase/firestore";

export type Customer = {
  id: string;
  companyId: string;

  customerName: string;
  accountNumber?: string;

  address: string;
  city: string;
  state: string;
  zip: string;

  phone?: string;
  email?: string;
  notes?: string;

  isActive: boolean;

  customerNameNormalized?: string;
  accountNumberNormalized?: string;
  addressNormalized?: string;
  phoneDigits?: string;
  emailNormalized?: string;

  createdAt?: Timestamp;
  createdBy?: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
};