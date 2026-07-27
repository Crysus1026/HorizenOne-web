"use client";

import { useUserProfile } from "@/hooks/useUserProfile";
import {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  createCustomer as createCustomerRecord,
  findDuplicateCustomers,
} from "../services/customerService";
import type { CustomerFormValues } from "../types/customerForm";
import type { CustomerMutationResult } from "../types/customerMutation";

type CreateCustomerOptions = {
  allowDuplicate?: boolean;
};

type UseCreateCustomerResult = {
  createCustomer: (
    values: CustomerFormValues,
    options?: CreateCustomerOptions
  ) => Promise<CustomerMutationResult>;
  isLoading: boolean;
  isSaving: boolean;
  canSubmit: boolean;
  error: string;
};

export function useCreateCustomer(): UseCreateCustomerResult {
  const {
    profile,
    companyId,
    isLoadingProfile,
    profileError,
  } = useUserProfile();

  const [isSaving, setIsSaving] = useState(false);
  const [operationError, setOperationError] =
    useState("");

  const userId = profile?.uid || "";

  const accessError = useMemo(() => {
    if (isLoadingProfile) {
      return "";
    }

    if (profileError) {
      return profileError;
    }

    if (!userId) {
      return "Unable to identify the logged-in user.";
    }

    if (!companyId) {
      return "Your user account is missing a company assignment.";
    }

    return "";
  }, [
    companyId,
    isLoadingProfile,
    profileError,
    userId,
  ]);

  const createCustomer = useCallback(
    async (
      values: CustomerFormValues,
      options: CreateCustomerOptions = {}
    ): Promise<CustomerMutationResult> => {
      if (isLoadingProfile) {
        setOperationError(
          "Your user profile is still loading."
        );

        return {
          status: "error",
        };
      }

      if (profileError) {
        setOperationError(profileError);

        return {
          status: "error",
        };
      }

      if (!userId) {
        setOperationError(
          "Unable to identify the logged-in user."
        );

        return {
          status: "error",
        };
      }

      if (!companyId) {
        setOperationError(
          "Your user account is missing a company assignment."
        );

        return {
          status: "error",
        };
      }

      try {
        setIsSaving(true);
        setOperationError("");

        if (!options.allowDuplicate) {
          const duplicates =
            await findDuplicateCustomers(
              companyId,
              values
            );

          if (duplicates.length > 0) {
            return {
              status: "duplicates",
              duplicates,
            };
          }
        }

        const customerId =
          await createCustomerRecord(
            companyId,
            userId,
            values
          );

        return {
          status: "success",
          customerId,
        };
      } catch (error: unknown) {
        console.error(
          "Create customer error:",
          error
        );

        setOperationError(
          error instanceof Error
            ? error.message
            : "Unable to save customer. Please try again."
        );

        return {
          status: "error",
        };
      } finally {
        setIsSaving(false);
      }
    },
    [
      companyId,
      isLoadingProfile,
      profileError,
      userId,
    ]
  );

  return {
    createCustomer,
    isLoading: isLoadingProfile,
    isSaving,
    canSubmit:
      !isLoadingProfile &&
      !profileError &&
      Boolean(companyId) &&
      Boolean(userId),
    error: operationError || accessError,
  };
}