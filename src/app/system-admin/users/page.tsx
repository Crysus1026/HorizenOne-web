"use client";

import AppShell from "@/components/AppShell";
import { auth, db } from "@/lib/firebase";
import { getUserProfile } from "@/lib/getUserProfile";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Company = {
  id: string;
  name?: string;
  Name?: string;
  companyCode?: string;
  isActive?: boolean;
};

type UserProfileRecord = {
  id: string;
  companyId?: string;
  companyName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
  isSystemAdmin?: boolean;
};

export default function SystemAdminUsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<UserProfileRecord[]>([]);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newCompanyId, setNewCompanyId] = useState("");
  const [newRole, setNewRole] = useState("Technician");
  const [newIsSystemAdmin, setNewIsSystemAdmin] = useState(false);
  const [editingUser, setEditingUser] =
  useState<UserProfileRecord | null>(null);

  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editCompanyId, setEditCompanyId] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      const profile = await getUserProfile(user.uid);

      if (!profile?.isSystemAdmin) {
        router.push("/dashboard");
        return;
      }

      setIsCheckingAccess(false);
      await loadUsers();
    });

    return () => unsubscribe();
  }, [router]);

  async function loadUsers() {
  setIsLoading(true);
  setError("");

  try {
    const companiesSnap = await getDocs(
      query(collection(db, "companies"), orderBy("name", "asc"))
    );

    const companyList = companiesSnap.docs
  .map((companyDoc) => ({
    id: companyDoc.id,
    ...(companyDoc.data() as Omit<Company, "id">),
  }))
  .filter((company) => company.isActive !== false);

setCompanies(companyList);

    const usersSnap = await getDocs(
      query(collection(db, "users"), orderBy("email", "asc"))
    );

    const userList = usersSnap.docs.map((userDoc) => ({
      id: userDoc.id,
      ...(userDoc.data() as Omit<UserProfileRecord, "id">),
    }));

    setUsers(userList);
  } catch (err) {
    console.error(err);
    setError("Unable to load users.");
  } finally {
    setIsLoading(false);
  }
}

  function resetCreateUserForm() {
    setNewEmail("");
    setNewPassword("");
    setNewFirstName("");
    setNewLastName("");
    setNewCompanyId("");
    setNewRole("Technician");
    setNewIsSystemAdmin(false);
  }

  async function handleCreateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (
      !newEmail.trim() ||
      !newPassword.trim() ||
      !newFirstName.trim() ||
      !newLastName.trim() ||
      !newCompanyId.trim() ||
      !newRole.trim()
    ) {
      setError("All required user fields must be completed.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Temporary password must be at least 6 characters.");
      return;
    }

    const selectedCompany = companies.find(
      (company) => company.id === newCompanyId
    );

    if (!selectedCompany) {
      setError("Selected company was not found.");
      return;
    }

    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError("You must be logged in to create users.");
      return;
    }

    setIsCreating(true);

    try {
      const idToken = await currentUser.getIdToken();

      const response = await fetch("/api/system-admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          email: newEmail.trim(),
          password: newPassword,
          firstName: newFirstName.trim(),
          lastName: newLastName.trim(),
          companyId: newCompanyId,
          companyName: selectedCompany.name || selectedCompany.Name || "",
          role: newRole,
          isSystemAdmin: newIsSystemAdmin,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to create user.");
      }

      resetCreateUserForm();
      await loadUsers();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unable to create user.");
    } finally {
      setIsCreating(false);
    }
  }

  function openEditUser(user: UserProfileRecord) {
  setEditingUser(user);

  setEditFirstName(user.firstName || "");
  setEditLastName(user.lastName || "");
  setEditRole(user.role || "Technician");
  setEditCompanyId(user.companyId || "");
}

async function saveUserChanges() {
  if (!editingUser) return;

  setIsUpdating(true);
  setError("");

  try {
    if (!editCompanyId) {
      setError("Company is required.");
      return;
    }

    const selectedCompany = companies.find(
      (company) => company.id === editCompanyId
    );

    if (!selectedCompany) {
      setError(`Selected company was not found. Company ID: ${editCompanyId}`);
      return;
    }

    await updateDoc(doc(db, "users", editingUser.id), {
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      role: editRole,
      companyId: editCompanyId,
      companyName: selectedCompany.name || "",
      updatedAt: serverTimestamp(),
    });

    setEditingUser(null);
    await loadUsers();
  } catch (err) {
    console.error(err);
    setError("Unable to update user.");
  } finally {
    setIsUpdating(false);
  }
}

  async function toggleUserStatus(user: UserProfileRecord) {
    setError("");

    try {
      await updateDoc(doc(db, "users", user.id), {
        isActive: !user.isActive,
        updatedAt: serverTimestamp(),
      });

      await loadUsers();
    } catch (err) {
      console.error(err);
      setError("Unable to update user status.");
    }
  }

  async function toggleSystemAdmin(user: UserProfileRecord) {
    setError("");

    try {
      await updateDoc(doc(db, "users", user.id), {
        isSystemAdmin: !user.isSystemAdmin,
        updatedAt: serverTimestamp(),
      });

      await loadUsers();
    } catch (err) {
      console.error(err);
      setError("Unable to update system admin access.");
    }
  }

  if (isCheckingAccess) {
    return (
      <AppShell>
        <p className="text-sm text-slate-400">Checking access...</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 px-6 text-white">
        <div>
          <p className="text-sm font-medium text-cyan-400">
            System Administrator
          </p>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="mt-1 text-sm text-slate-400">
            View users, company access, roles, active status, and system administrator access.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {editingUser && (
  <section className="rounded-xl border border-cyan-700 bg-slate-900 p-5 shadow-sm">
    <h2 className="text-lg font-semibold text-white">
      Edit User
    </h2>

    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <label className="block">
        <span className="text-sm text-slate-300">
          First Name
        </span>

        <input
          value={editFirstName}
          onChange={(e) => setEditFirstName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        />
      </label>

      <label className="block">
        <span className="text-sm text-slate-300">
          Last Name
        </span>

        <input
          value={editLastName}
          onChange={(e) => setEditLastName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        />
      </label>

      <label className="block">
        <span className="text-sm text-slate-300">
          Company
        </span>

        <select
          value={editCompanyId}
          onChange={(e) => setEditCompanyId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        >
        <option value="">Select company</option>
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name || "Unnamed Company"}
          </option>
        ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm text-slate-300">
          Role
        </span>

        <select
          value={editRole}
          onChange={(e) => setEditRole(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
        >
          <option value="Admin">Admin</option>
          <option value="Manager">Manager</option>
          <option value="Dispatcher">Dispatcher</option>
          <option value="Technician">Technician</option>
        </select>
      </label>
    </div>

    <div className="mt-4 flex gap-2">
      <button
        onClick={saveUserChanges}
        disabled={isUpdating}
        className="rounded-lg bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-500"
      >
        Save
      </button>

      <button
        onClick={() => setEditingUser(null)}
        className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
      >
        Cancel
      </button>
    </div>
  </section>
)}

                <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-white">Create User</h2>

          <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  First Name *
                </span>
                <input
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  placeholder="First name"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Last Name *
                </span>
                <input
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  placeholder="Last name"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Email *
                </span>
                <input
                  type="email"
                  autoComplete="off"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  placeholder="user@example.com"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Temporary Password *
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                  placeholder="Minimum 6 characters"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Company *
                </span>
                <select
                  value={newCompanyId}
                  onChange={(e) => setNewCompanyId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                >
                  <option value="">Select company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name || "Unnamed Company"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Role *
                </span>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white"
                >
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Dispatcher">Dispatcher</option>
                  <option value="Technician">Technician</option>
                </select>
              </label>

              <label className="flex items-center gap-2 md:col-span-2">
                <input
                  type="checkbox"
                  checked={newIsSystemAdmin}
                  onChange={(e) => setNewIsSystemAdmin(e.target.checked)}
                />
                <span className="text-sm font-medium text-slate-300">
                  Grant System Administrator access
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? "Creating..." : "Create User"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">User Profiles</h2>

            <button
              onClick={loadUsers}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-slate-400">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              No users have been created yet.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800 text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">System Admin</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-700">
                  {users.map((user) => {
                    const fullName = `${user.firstName || ""} ${
                      user.lastName || ""
                    }`.trim();

                    return (
                      <tr key={user.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">
                            {fullName || "Unnamed User"}
                          </div>
                          <div className="text-xs text-slate-400">
                            {user.email || "No email"}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-300">
                          <div>{user.companyName || "—"}</div>
                          <div className="text-xs text-slate-500">{user.companyId || ""}</div>
                        </td>

                        <td className="px-4 py-3 text-slate-300">
                          {user.role || "—"}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              user.isSystemAdmin
                                ? "bg-cyan-900 text-cyan-300"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {user.isSystemAdmin ? "Yes" : "No"}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              user.isActive
                                ? "bg-cyan-900 text-cyan-300"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => openEditUser(user)}
                              className="rounded-lg border border-cyan-700 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-slate-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleUserStatus(user)}
                              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                            >
                              {user.isActive ? "Deactivate" : "Activate"}
                            </button>

                            <button
                              onClick={() => toggleSystemAdmin(user)}
                              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                            >
                              {user.isSystemAdmin
                                ? "Remove System Admin"
                                : "Make System Admin"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}