import type { DuplicateCustomerMatch } from "./customerDuplicate";

export type CustomerMutationResult =
  | {
      status: "success";
      customerId: string;
    }
  | {
      status: "duplicates";
      duplicates: DuplicateCustomerMatch[];
    }
  | {
      status: "error";
    };