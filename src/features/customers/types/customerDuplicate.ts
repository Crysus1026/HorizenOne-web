import type { Customer } from "@/types/customer";

export type DuplicateReason =
  | "account-number"
  | "email"
  | "phone"
  | "name-and-address";

export type DuplicateCustomerMatch = {
  customer: Customer;
  reasons: DuplicateReason[];
};