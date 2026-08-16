"use client";

import type { UserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import { updateUserProfile } from "../services/updateUserProfile";
import {
  canEditUserAccess,
  canEditUserCompany,
} from "../utils/userProfilePermissions";

type UserProfileEditFormProps = {
  viewerProfile: UserProfile;
  selectedProfile: UserProfile;
};

const availableRoles = [
  "Admin",
  "Manager",
  "Dispatcher",
  "Technician",
];

export function UserProfileEditForm({
  viewerProfile,
  selectedProfile,
}: UserProfileEditFormProps) {
  const router = useRouter();

  const [firstName, setFirstName] = useState(
    selectedProfile.firstName
  );

  const [lastName, setLastName] = useState(
    selectedProfile.lastName
  );

  const [role, setRole] = useState(
    selectedProfile.role
  );

  const [companyId, setCompanyId] = useState(
    selectedProfile.companyId
  );

  const [companyName, setCompanyName] = useState(
    selectedProfile.companyName
  );

  const [isActive, setIsActive] = useState(
    selectedProfile.isActive
  );

  const [technicianEnabled, setTechnicianEnabled] = useState<boolean>(
    selectedProfile.role === "Technician" ||
      selectedProfile.technicianEnabled
  );

  const [projectIdsText, setProjectIdsText] =
    useState(
      selectedProfile.projectIds.join("\n")
    );

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const mayEditAccess =
    canEditUserAccess(viewerProfile);

  const mayEditCompany =
    canEditUserCompany(viewerProfile);

  const roleOptions = useMemo(() => {
    if (viewerProfile.isSystemAdmin) {
      return [
        "System Admin",
        ...availableRoles,
      ];
    }

    return availableRoles;
  }, [viewerProfile.isSystemAdmin]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();

    if (!normalizedFirstName) {
      setError("First name is required.");
      return;
    }

    if (!normalizedLastName) {
      setError("Last name is required.");
      return;
    }

    const projectIds = Array.from(
      new Set(
        projectIdsText
          .split(/\r?\n|,/)
          .map((value) => value.trim())
          .filter(Boolean)
      )
    );

    setIsSaving(true);
    setError("");

    try {
      await updateUserProfile(
        selectedProfile.uid,
        {
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          projectIds,
          updatedBy: viewerProfile.uid,

          ...(mayEditAccess
            ? {
                role,
                isActive,
                technicianEnabled:
                  role === "Technician"
                    ? true
                    : technicianEnabled,
                technicianId:
                  role === "Technician" || technicianEnabled
                    ? selectedProfile.uid
                    : "",
              }
            : {}),

          ...(mayEditCompany
            ? {
                companyId: companyId.trim(),
                companyName: companyName.trim(),
              }
            : {}),
        }
      );

      router.push(
        `/users/${selectedProfile.uid}`
      );

      router.refresh();
    } catch (err) {
      console.error(
        "Unable to update user profile:",
        err
      );

      setError(
        "Unable to save the user profile."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Personal Information
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Update the user&apos;s name and account
            information.
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="firstName"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              First name
            </label>

            <input
              id="firstName"
              value={firstName}
              onChange={(event) =>
                setFirstName(event.target.value)
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
            />
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Last name
            </label>

            <input
              id="lastName"
              value={lastName}
              onChange={(event) =>
                setLastName(event.target.value)
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Email
            </label>

            <input
              value={selectedProfile.email}
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3 text-slate-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              Authentication email changes should be
              handled separately.
            </p>
          </div>
        </div>
      </section>

      {mayEditAccess ? (
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-white">
            Account Access
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="role"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Role
              </label>

              <select
                id="role"
                value={role}
                onChange={(event) =>
                  setRole(event.target.value)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
              >
                {roleOptions.map((roleOption) => (
                  <option
                    key={roleOption}
                    value={roleOption}
                  >
                    {roleOption}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Account status
              </label>

              <select
                id="status"
                value={
                  isActive ? "active" : "inactive"
                }
                onChange={(event) =>
                  setIsActive(
                    event.target.value === "active"
                  )
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
              >
                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>
              </select>
            </div>
            <div className="mt-6 border-t border-slate-800 pt-6">
              <div className="flex items-start gap-3">
                <input
                  id="technicianEnabled"
                  type="checkbox"
                  checked={
                    role === "Technician"
                      ? true
                      : technicianEnabled
                  }
                  disabled={role === "Technician"}
                  onChange={(event) =>
                    setTechnicianEnabled(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950"
                />

                <div>
                  <label
                    htmlFor="technicianEnabled"
                    className="text-sm font-medium text-white"
                  >
                    Field Work Access
                  </label>

                  <p className="mt-1 text-sm text-slate-400">
                    Allow this user to receive technician assignments
                    and access the technician portal.
                  </p>

                  {role === "Technician" ? (
                    <p className="mt-2 text-xs text-cyan-400">
                      Field Work Access is automatically enabled for
                      users with the Technician role.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {mayEditCompany ? (
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-white">
            Company Assignment
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="companyName"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Company name
              </label>

              <input
                id="companyName"
                value={companyName}
                onChange={(event) =>
                  setCompanyName(event.target.value)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
              />
            </div>

            <div>
              <label
                htmlFor="companyId"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Company ID
              </label>

              <input
                id="companyId"
                value={companyId}
                onChange={(event) =>
                  setCompanyId(event.target.value)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
              />
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-white">
          Program Assignments
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Enter one project ID per line.
        </p>

        <textarea
          value={projectIdsText}
          onChange={(event) =>
            setProjectIdsText(event.target.value)
          }
          rows={8}
          className="mt-5 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-cyan-500"
          placeholder="project-id-1&#10;project-id-2"
        />
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSaving}
          className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving
            ? "Saving..."
            : "Save Changes"}
        </button>
      </div>
    </form>
  );
}