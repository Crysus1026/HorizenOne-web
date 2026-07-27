import type { DuplicateCustomerMatch } from "../services/customerService";

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