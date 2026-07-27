import type { Customer } from "@/types/customer";

export function customerMatchesSearch(
  customer: Customer,
  searchTerm: string
): boolean {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return [
    customer.customerName,
    customer.accountNumber,
    customer.address,
    customer.city,
    customer.state,
    customer.zip,
    customer.phone,
    customer.email,
  ].some((value) =>
    value?.toLowerCase().includes(normalizedSearch)
  );
}