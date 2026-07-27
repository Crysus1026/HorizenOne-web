import type { CustomerFormValues } from "../types/customerForm";

export type CustomerNormalizedFields = {
  customerNameNormalized: string;
  accountNumberNormalized: string;
  addressNormalized: string;
  phoneDigits: string;
  emailNormalized: string;
};

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

function normalizeAccountNumber(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function getCustomerNormalizedFields(
  values: CustomerFormValues
): CustomerNormalizedFields {
  return {
    customerNameNormalized: normalizeText(
      values.customerName
    ),
    accountNumberNormalized: normalizeAccountNumber(
      values.accountNumber
    ),
    addressNormalized: normalizeText(values.address),
    phoneDigits: normalizePhone(values.phone),
    emailNormalized: normalizeEmail(values.email),
  };
}