"use client";

import AppShell from "@/components/AppShell";
import { useUserProfile } from "@/hooks/useUserProfile";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type ManagedUser = {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  companyId: string;
  companyName: string;
  isActive: boolean;
  projectIds: string[];
};

const authorizedRoles = [
  "System Admin",
  "Admin",
  "Manager",
];

function normalizeUser(
  id: string,
  data: Record<string, unknown>
): ManagedUser {
  return {
    uid: id,

    firstName:
      typeof data.firstName === "string"
        ? data.firstName
        : "",

    lastName:
      typeof data.lastName === "string"
        ? data.lastName
        : "",

    email:
      typeof data.email === "string"
        ? data.email
        : "",

    role:
      typeof data.role === "string"
        ? data.role
        : "",

    companyId:
      typeof data.companyId === "string"
        ? data.companyId
        : "",

    companyName:
      typeof data.companyName === "string"
        ? data.companyName
        : "",

    isActive: data.isActive === true,

    projectIds: Array.isArray(data.projectIds)
      ? data.projectIds.filter(
          (value): value is string =>
            typeof value === "string"
        )
      : [],
  };
}

function getFullName(user: ManagedUser): string {
  const fullName =
    `${user.firstName} ${user.lastName}`.trim();

  return fullName || user.email || "Unnamed user";
}

function getInitials(user: ManagedUser): string {
  const firstInitial = user.firstName
    .trim()
    .charAt(0);

  const lastInitial = user.lastName
    .trim()
    .charAt(0);

  const initials =
    `${firstInitial}${lastInitial}`.toUpperCase();

  return initials || "U";
}

export default function UserManagementPage() {
  const {
    profile: viewerProfile,
    isLoadingProfile,
    profileError,
  } = useUserProfile();

  const [users, setUsers] = useState<ManagedUser[]>(
    []
  );

  const [isLoadingUsers, setIsLoadingUsers] =
    useState(true);

  const [usersError, setUsersError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const [roleFilter, setRoleFilter] = useState("All");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const hasPageAccess = Boolean(
    viewerProfile &&
      viewerProfile.isActive &&
      (
        viewerProfile.isSystemAdmin ||
        authorizedRoles.includes(viewerProfile.role)
      )
  );

  const loadUsers = useCallback(async () => {
    if (!viewerProfile || !hasPageAccess) {
      setUsers([]);
      setIsLoadingUsers(false);
      return;
    }

    setIsLoadingUsers(true);
    setUsersError("");

    try {
      const usersRef = collection(db, "users");

      const usersQuery = viewerProfile.isSystemAdmin
        ? query(
            usersRef,
            orderBy("lastName", "asc")
          )
        : query(
            usersRef,
            where(
              "companyId",
              "==",
              viewerProfile.companyId
            )
          );

      const snapshot = await getDocs(usersQuery);

      const loadedUsers = snapshot.docs
        .map((userDoc) =>
          normalizeUser(
            userDoc.id,
            userDoc.data()
          )
        )
        .sort((a, b) =>
          getFullName(a).localeCompare(
            getFullName(b)
          )
        );

      setUsers(loadedUsers);
    } catch (error) {
      console.error(
        "Unable to load users:",
        error
      );

      setUsers([]);
      setUsersError(
        "Unable to load user accounts."
      );
    } finally {
      setIsLoadingUsers(false);
    }
  }, [viewerProfile, hasPageAccess]);

  useEffect(() => {
    if (isLoadingProfile) {
      return;
    }

    void loadUsers();
  }, [
    isLoadingProfile,
    loadUsers,
  ]);

  const availableRoles = useMemo(() => {
    return Array.from(
      new Set(
        users
          .map((user) => user.role)
          .filter(Boolean)
      )
    ).sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        getFullName(user)
          .toLowerCase()
          .includes(normalizedSearch) ||
        user.email
          .toLowerCase()
          .includes(normalizedSearch) ||
        user.role
          .toLowerCase()
          .includes(normalizedSearch) ||
        user.companyName
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesRole =
        roleFilter === "All" ||
        user.role === roleFilter;

      const matchesStatus =
        statusFilter === "All" ||
        (
          statusFilter === "Active" &&
          user.isActive
        ) ||
        (
          statusFilter === "Inactive" &&
          !user.isActive
        );

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      );
    });
  }, [
    users,
    searchTerm,
    roleFilter,
    statusFilter,
  ]);

  const activeUserCount = users.filter(
    (user) => user.isActive
  ).length;

  const inactiveUserCount =
    users.length - activeUserCount;

  if (isLoadingProfile) {
    return (
      <AppShell>
        <div className="p-8">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
            Loading user management...
          </div>
        </div>
      </AppShell>
    );
  }

  if (profileError || !viewerProfile) {
    return (
      <AppShell>
        <div className="p-8">
          <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-6">
            <h1 className="text-xl font-semibold text-red-300">
              Unable to open User Management
            </h1>

            <p className="mt-2 text-sm text-red-200">
              {profileError ||
                "Your user profile could not be loaded."}
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!hasPageAccess) {
    return (
      <AppShell>
        <div className="p-8">
          <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-6">
            <h1 className="text-xl font-semibold text-amber-300">
              Access denied
            </h1>

            <p className="mt-2 text-sm text-amber-200">
              Your account does not have permission
              to manage or view other user profiles.
            </p>

            <Link
              href="/"
              className="mt-5 inline-flex rounded-lg border border-amber-700 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-900/40"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8 p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="text-sm text-cyan-300 transition hover:text-cyan-200"
              >
                Admin
              </Link>

              <span className="text-slate-600">
                /
              </span>

              <span className="text-sm text-slate-400">
                User Management
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-bold text-white">
              User Management
            </h1>

            <p className="mt-2 text-slate-400">
              View user profiles, account status,
              roles, and program assignments.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadUsers()}
            disabled={isLoadingUsers}
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoadingUsers
              ? "Refreshing..."
              : "Refresh Users"}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Total Users
            </p>

            <p className="mt-2 text-3xl font-semibold text-white">
              {users.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Active Users
            </p>

            <p className="mt-2 text-3xl font-semibold text-emerald-300">
              {activeUserCount}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Inactive Users
            </p>

            <p className="mt-2 text-3xl font-semibold text-red-300">
              {inactiveUserCount}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
            <div>
              <label
                htmlFor="user-search"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Search users
              </label>

              <input
                id="user-search"
                type="search"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search by name, email, role, or company"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
              />
            </div>

            <div>
              <label
                htmlFor="role-filter"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Role
              </label>

              <select
                id="role-filter"
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(event.target.value)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
              >
                <option value="All">
                  All roles
                </option>

                {availableRoles.map((role) => (
                  <option
                    key={role}
                    value={role}
                  >
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="status-filter"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Status
              </label>

              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
              >
                <option value="All">
                  All statuses
                </option>

                <option value="Active">
                  Active
                </option>

                <option value="Inactive">
                  Inactive
                </option>
              </select>
            </div>
          </div>
        </div>

        {usersError ? (
          <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-5">
            <p className="text-sm text-red-200">
              {usersError}
            </p>

            <button
              type="button"
              onClick={() => void loadUsers()}
              className="mt-4 rounded-lg border border-red-800 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-900/40"
            >
              Try Again
            </button>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-white">
              User Accounts
            </h2>

            <p className="text-sm text-slate-500">
              {filteredUsers.length} of{" "}
              {users.length}
            </p>
          </div>

          {isLoadingUsers ? (
            <div className="p-8 text-center text-slate-400">
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-300">
                No users match the current filters.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setRoleFilter("All");
                  setStatusFilter("All");
                }}
                className="mt-4 text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-800 md:hidden">
                {filteredUsers.map((user) => (
                  <div
                    key={user.uid}
                    className="p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-sm font-semibold text-cyan-300">
                        {getInitials(user)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-white">
                          {getFullName(user)}
                        </p>

                        <p className="mt-1 truncate text-sm text-slate-400">
                          {user.email || "No email"}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-300">
                            {user.role ||
                              "No role"}
                          </span>

                          <span
                            className={
                              user.isActive
                                ? "rounded-full border border-emerald-900 bg-emerald-950/40 px-2.5 py-1 text-xs text-emerald-300"
                                : "rounded-full border border-red-900 bg-red-950/40 px-2.5 py-1 text-xs text-red-300"
                            }
                          >
                            {user.isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </div>

                        <p className="mt-3 text-xs text-slate-500">
                          {
                            user.projectIds
                              .length
                          }{" "}
                          assigned{" "}
                          {user.projectIds
                            .length === 1
                            ? "program"
                            : "programs"}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/users/${user.uid}`}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-500 hover:text-white"
                    >
                      View Profile
                    </Link>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-950/70">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        User
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Role
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Company
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Programs
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.uid}
                        className="transition hover:bg-slate-800/50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-sm font-semibold text-cyan-300">
                              {getInitials(user)}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-medium text-white">
                                {getFullName(user)}
                              </p>

                              <p className="truncate text-sm text-slate-400">
                                {user.email ||
                                  "No email"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-300">
                          {user.role || "—"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-300">
                          {user.companyName ||
                            user.companyId ||
                            "—"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-300">
                          {user.projectIds.length}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={
                              user.isActive
                                ? "inline-flex rounded-full border border-emerald-900 bg-emerald-950/40 px-2.5 py-1 text-xs font-medium text-emerald-300"
                                : "inline-flex rounded-full border border-red-900 bg-red-950/40 px-2.5 py-1 text-xs font-medium text-red-300"
                            }
                          >
                            {user.isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/users/${user.uid}`}
                            className="inline-flex rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-500 hover:text-white"
                          >
                            View Profile
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}