"use client";

import { useUserProfile } from "@/hooks/useUserProfile";
import { db } from "@/lib/firebase";
import type { Customer } from "@/types/customer";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  where,
} from "firebase/firestore";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { customerMatchesSearch } from "../utils/customerSearch";

const CUSTOMERS_PER_PAGE = 10;

type CustomerPage = {
  customers: Customer[];
  lastDocument: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
};

type UseCustomersResult = {
  customers: Customer[];
  isLoading: boolean;
  error: string;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isSearching: boolean;
  nextPage: () => Promise<void>;
  previousPage: () => void;
};

function mapCustomerDocument(
  document: QueryDocumentSnapshot<DocumentData>
): Customer {
  return {
    id: document.id,
    ...(document.data() as Omit<Customer, "id">),
  };
}

export function useCustomers(
  searchTerm = ""
): UseCustomersResult {
  const {
    companyId,
    isSystemAdmin,
    isLoadingProfile,
    profileError,
  } = useUserProfile();

  const [pages, setPages] = useState<CustomerPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] =
    useState(0);

  const [searchResults, setSearchResults] = useState<
    Customer[]
  >([]);

  const [isLoadingPage, setIsLoadingPage] =
    useState(false);

  const [isLoadingSearch, setIsLoadingSearch] =
    useState(false);

  const [requestError, setRequestError] =
    useState("");

  const activeRequestRef = useRef(0);

  const normalizedSearchTerm = searchTerm
    .trim()
    .toLowerCase();

  const isSearching = normalizedSearchTerm.length > 0;

  const canLoadCustomers =
    !isLoadingProfile &&
    !profileError &&
    (isSystemAdmin || Boolean(companyId));

  const companyConstraints = useMemo<
    QueryConstraint[]
  >(() => {
    if (!isSystemAdmin && companyId) {
      return [where("companyId", "==", companyId)];
    }

    return [];
  }, [companyId, isSystemAdmin]);

  const loadCustomerPage = useCallback(
    async (
      lastDocument?: QueryDocumentSnapshot<DocumentData>
    ): Promise<CustomerPage> => {
      const paginationConstraints: QueryConstraint[] =
        lastDocument
          ? [
              startAfter(lastDocument),
              limit(CUSTOMERS_PER_PAGE + 1),
            ]
          : [limit(CUSTOMERS_PER_PAGE + 1)];

      const customerQuery = query(
        collection(db, "customers"),
        ...companyConstraints,
        where("isActive", "==", true),
        orderBy("createdAt", "desc"),
        ...paginationConstraints
      );

      const snapshot = await getDocs(customerQuery);

      const hasMore =
        snapshot.docs.length > CUSTOMERS_PER_PAGE;

      const visibleDocuments = hasMore
        ? snapshot.docs.slice(0, CUSTOMERS_PER_PAGE)
        : snapshot.docs;

      return {
        customers: visibleDocuments.map(
          mapCustomerDocument
        ),
        lastDocument:
          visibleDocuments.length > 0
            ? visibleDocuments[
                visibleDocuments.length - 1
              ]
            : null,
        hasMore,
      };
    },
    [companyConstraints]
  );

  const searchAllCustomers = useCallback(
    async (term: string): Promise<Customer[]> => {
      const customerQuery = query(
        collection(db, "customers"),
        ...companyConstraints,
        where("isActive", "==", true),
        orderBy("customerName", "asc")
      );

      const snapshot = await getDocs(customerQuery);

      return snapshot.docs
        .map(mapCustomerDocument)
        .filter((customer) =>
          customerMatchesSearch(customer, term)
        );
    },
    [companyConstraints]
  );

  /*
   * Load the first paginated page when the user context
   * becomes available or changes.
   */
  useEffect(() => {
    if (!canLoadCustomers) {
      return;
    }

    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;

    async function loadInitialPage() {
      try {
        setIsLoadingPage(true);
        setRequestError("");

        const firstPage = await loadCustomerPage();

        if (activeRequestRef.current !== requestId) {
          return;
        }

        setPages([firstPage]);
        setCurrentPageIndex(0);
      } catch (error: unknown) {
        console.error(
          "Unable to load customers:",
          error
        );

        if (activeRequestRef.current !== requestId) {
          return;
        }

        setPages([]);
        setCurrentPageIndex(0);

        setRequestError(
          error instanceof Error
            ? error.message
            : "Unable to load customers."
        );
      } finally {
        if (activeRequestRef.current === requestId) {
          setIsLoadingPage(false);
        }
      }
    }

    void loadInitialPage();
  }, [canLoadCustomers, loadCustomerPage]);

  /*
   * Search the full authorized customer collection.
   *
   * The page provides the debounced search term, so this
   * does not execute after every individual keystroke.
   */
  useEffect(() => {
    if (!canLoadCustomers) {
      return;
    }

    if (!normalizedSearchTerm) {
      setSearchResults([]);
      setIsLoadingSearch(false);
      return;
    }

    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;

    async function runSearch() {
      try {
        setIsLoadingSearch(true);
        setRequestError("");

        const results = await searchAllCustomers(
          normalizedSearchTerm
        );

        if (activeRequestRef.current !== requestId) {
          return;
        }

        setSearchResults(results);
      } catch (error: unknown) {
        console.error(
          "Unable to search customers:",
          error
        );

        if (activeRequestRef.current !== requestId) {
          return;
        }

        setSearchResults([]);

        setRequestError(
          error instanceof Error
            ? error.message
            : "Unable to search customers."
        );
      } finally {
        if (activeRequestRef.current === requestId) {
          setIsLoadingSearch(false);
        }
      }
    }

    void runSearch();
  }, [
    canLoadCustomers,
    normalizedSearchTerm,
    searchAllCustomers,
  ]);

  const nextPage = useCallback(async () => {
    if (isSearching || isLoadingPage) {
      return;
    }

    const currentPage = pages[currentPageIndex];

    if (!currentPage?.hasMore) {
      return;
    }

    const nextPageIndex = currentPageIndex + 1;

    if (pages[nextPageIndex]) {
      setCurrentPageIndex(nextPageIndex);
      return;
    }

    if (!currentPage.lastDocument) {
      return;
    }

    try {
      setIsLoadingPage(true);
      setRequestError("");

      const loadedPage = await loadCustomerPage(
        currentPage.lastDocument
      );

      setPages((currentPages) => [
        ...currentPages,
        loadedPage,
      ]);

      setCurrentPageIndex(nextPageIndex);
    } catch (error: unknown) {
      console.error(
        "Unable to load the next customer page:",
        error
      );

      setRequestError(
        error instanceof Error
          ? error.message
          : "Unable to load the next page of customers."
      );
    } finally {
      setIsLoadingPage(false);
    }
  }, [
    currentPageIndex,
    isLoadingPage,
    isSearching,
    loadCustomerPage,
    pages,
  ]);

  const previousPage = useCallback(() => {
    if (isSearching || isLoadingPage) {
      return;
    }

    setCurrentPageIndex((currentIndex) =>
      Math.max(0, currentIndex - 1)
    );
  }, [isLoadingPage, isSearching]);

  const currentPage = pages[currentPageIndex];

  const accessError =
    profileError ||
    (!isLoadingProfile &&
    !isSystemAdmin &&
    !companyId
      ? "Your user account is missing a company assignment."
      : "");

  return {
    customers: isSearching
      ? searchResults
      : currentPage?.customers ?? [],

    isLoading:
      isLoadingProfile ||
      isLoadingPage ||
      isLoadingSearch,

    error: requestError || accessError,

    currentPage: currentPageIndex + 1,

    hasNextPage:
      !isSearching &&
      (currentPage?.hasMore ?? false),

    hasPreviousPage:
      !isSearching && currentPageIndex > 0,

    isSearching,
    nextPage,
    previousPage,
  };
}