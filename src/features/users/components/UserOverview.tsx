import type { UserProfile } from "@/hooks/useUserProfile";

import {
  ProfileDetailList,
  type ProfileDetailItem,
} from "./ProfileDetailList";

import { ProfileSection } from "./ProfileSection";

type UserOverviewProps = {
  profile: UserProfile;
};

export function UserOverview({
  profile,
}: UserOverviewProps) {
  const personalItems: ProfileDetailItem[] = [
    {
      label: "First name",
      value: profile.firstName,
    },
    {
      label: "Last name",
      value: profile.lastName,
    },
    {
      label: "Email",
      value: profile.email,
    },
  ];

  const accountItems: ProfileDetailItem[] = [
    {
      label: "Role",
      value: profile.role,
    },
    {
      label: "Account status",
      value: profile.isActive
        ? "Active"
        : "Inactive",
    },
    {
      label: "System administrator",
      value: profile.isSystemAdmin
        ? "Yes"
        : "No",
    },
  ];

  const companyItems: ProfileDetailItem[] = [
    {
      label: "Company",
      value: profile.companyName,
    },
    {
      label: "Company ID",
      value: profile.companyId,
    },
    {
      label: "User ID",
      value: profile.uid,
    },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ProfileSection
        title="Personal Information"
        description="Your current identity and contact information."
      >
        <ProfileDetailList items={personalItems} />
      </ProfileSection>

      <ProfileSection
        title="Account Access"
        description="Your current role and account status."
      >
        <ProfileDetailList items={accountItems} />
      </ProfileSection>

      <ProfileSection
        title="Company Information"
        description="The company associated with your account."
      >
        <ProfileDetailList items={companyItems} />
      </ProfileSection>

      <ProfileSection
        title="Assigned Projects"
        description="Programs and projects assigned to your account."
      >
        {profile.projectIds.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {profile.projectIds.map((projectId) => (
              <span
                key={projectId}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-200"
              >
                {projectId}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            No projects are currently assigned.
          </p>
        )}
      </ProfileSection>
    </div>
  );
}