export type CustomerFormValues = {
  customerName: string;
  accountNumber: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  notes: string;
  isActive: boolean;
};

export const EMPTY_CUSTOMER_FORM: CustomerFormValues = {
  customerName: "",
  accountNumber: "",
  address: "",
  city: "",
  state: "MD",
  zip: "",
  phone: "",
  email: "",
  notes: "",
  isActive: true,
};

export function normalizeCustomerFormValues(
  values: CustomerFormValues
): CustomerFormValues {
  return {
    customerName: values.customerName.trim(),
    accountNumber: values.accountNumber.trim(),
    address: values.address.trim(),
    city: values.city.trim(),
    state: values.state.trim().toUpperCase(),
    zip: values.zip.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    notes: values.notes.trim(),
    isActive: values.isActive,
  };
}