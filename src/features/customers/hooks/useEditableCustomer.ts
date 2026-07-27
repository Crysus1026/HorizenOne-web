"use client";

import { useUserProfile } from "@/hooks/useUserProfile";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  findDuplicateCustomers,
  getCustomerById,
  updateCustomer as updateCustomerRecord,
} from "../services/customerService";
import type { CustomerFormValues } from "../types/customerForm";
import type { CustomerMutationResult } from "../types/customerMutation";

type UpdateCustomerOptions = {
  allowDuplicate?: boolean;
};

type UseEditableCustomerResult = {
  initialValues: CustomerFormValues | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string;
  updateCustomer: (
    values: CustomerFormValues,
    options?: UpdateCustomerOptions
  ) => Promise<CustomerMutationResult>;
};

export function useEditableCustomer(
  customerId: string
): UseEditableCustomerResult {
  const {
    profile,
    companyId,
    isSystemAdmin,
    isLoadingProfile,
    profileError,
  } = useUserProfile();

  /*
   * Use the authenticated Firebase UID stored on the profile.
   *
   * If your profile type uses `id` instead of `uid`, change
   * this line to:
   *
   * const userId = profile?.id || "";
   */
  const userId = profile?.uid || "";

  const [initialValues, setInitialValues] =
    useState<CustomerFormValues | null>(null);

  /*
   * This value is used only for authorization and duplicate
   * checking. It is never sent through updateCustomerRecord(),
   * so company ownership cannot be changed from this hook.
   */
  const [customerCompanyId, setCustomerCompanyId] =
    useState("");

  const [isLoadingCustomer, setIsLoadingCustomer] =
    useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoadingProfile) {
      return;
    }

    if (profileError) {
      setError(profileError);
      setInitialValues(null);
      setCustomerCompanyId("");
      setIsLoadingCustomer(false);
      return;
    }

    if (!customerId) {
      setError("Customer ID is missing.");
      setInitialValues(null);
      setCustomerCompanyId("");
      setIsLoadingCustomer(false);
      return;
    }

    if (!userId) {
      setError(
        "Unable to identify the logged-in user."
      );
      setInitialValues(null);
      setCustomerCompanyId("");
      setIsLoadingCustomer(false);
      return;
    }

    if (!isSystemAdmin && !companyId) {
      setError(
        "Your user account is missing a company assignment."
      );
      setInitialValues(null);
      setCustomerCompanyId("");
      setIsLoadingCustomer(false);
      return;
    }

    let isCancelled = false;

    async function loadCustomer() {
      try {
        setIsLoadingCustomer(true);
        setError("");
        setInitialValues(null);
        setCustomerCompanyId("");

        const customer =
          await getCustomerById(customerId);

        if (isCancelled) {
          return;
        }

        if (!customer) {
          setError("Customer not found.");
          return;
        }

        if (!customer.companyId) {
          setError(
            "This customer is missing a company assignment."
          );
          return;
        }

        /*
         * Customers remain company-owned.
         *
         * Non-System Admin users may edit only customers
         * belonging to their assigned company.
         */
        if (
          !isSystemAdmin &&
          customer.companyId !== companyId
        ) {
          setError(
            "You do not have permission to edit this customer."
          );
          return;
        }

        setCustomerCompanyId(customer.companyId);

        setInitialValues({
          customerName:
            customer.customerName ||
            customer.name ||
            "",
          accountNumber:
            customer.accountNumber || "",
          address: customer.address || "",
          city: customer.city || "",
          state: customer.state || "MD",
          zip: customer.zip || "",
          phone: customer.phone || "",
          email: customer.email || "",
          notes: customer.notes || "",
          isActive: customer.isActive !== false,
        });
      } catch (loadError: unknown) {
        console.error(
          "Load customer error:",
          loadError
        );

        if (isCancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load customer."
        );
      } finally {
        if (!isCancelled) {
          setIsLoadingCustomer(false);
        }
      }
    }

    void loadCustomer();

    return () => {
      isCancelled = true;
    };
  }, [
    customerId,
    companyId,
    isSystemAdmin,
    isLoadingProfile,
    profileError,
    userId,
  ]);

  const updateCustomer = useCallback(
    async (
      values: CustomerFormValues,
      options: UpdateCustomerOptions = {}
    ): Promise<CustomerMutationResult> => {
      if (!customerId) {
        setError("Customer ID is missing.");

        return {
          status: "error",
        };
      }

      if (!userId) {
        setError(
          "Unable to identify the logged-in user."
        );

        return {
          status: "error",
        };
      }

      if (!customerCompanyId) {
        setError(
          "This customer is missing a company assignment."
        );

        return {
          status: "error",
        };
      }

      if (
        !isSystemAdmin &&
        customerCompanyId !== companyId
      ) {
        setError(
          "You do not have permission to edit this customer."
        );

        return {
          status: "error",
        };
      }

      try {
        setIsSaving(true);
        setError("");

        /*
         * Check for possible duplicates unless the user
         * has already reviewed the warning and chosen to
         * continue.
         *
         * The current customer is excluded from the results.
         */
        if (!options.allowDuplicate) {
          const duplicates =
            await findDuplicateCustomers(
              customerCompanyId,
              values,
              customerId
            );

          if (duplicates.length > 0) {
            return {
              status: "duplicates",
              duplicates,
            };
          }
        }

        /*
         * companyId is intentionally not passed here.
         *
         * The service updates customer fields, normalized
         * search fields, updatedAt, and updatedBy only.
         */
        await updateCustomerRecord(
          customerId,
          userId,
          values
        );

        return {
          status: "success",
          customerId,
        };
      } catch (updateError: unknown) {
        console.error(
          "Update customer error:",
          updateError
        );

        setError(
          updateError instanceof Error
            ? updateError.message
            : "Unable to update customer."
        );

        return {
          status: "error",
        };
      } finally {
        setIsSaving(false);
      }
    },
    [
      customerId,
      userId,
      customerCompanyId,
      companyId,
      isSystemAdmin,
    ]
  );

  return {
    initialValues,
    isLoading:
      isLoadingProfile || isLoadingCustomer,
    isSaving,
    error,
    updateCustomer,
  };
}