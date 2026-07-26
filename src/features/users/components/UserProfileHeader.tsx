import type { UserProfile } from "@/hooks/useUserProfile";

type UserProfileHeaderProps = {
  profile: UserProfile;
};

function getInitials(
  firstName: string,
  lastName: string
): string {
  const firstInitial = firstName.trim().charAt(0);
  const lastInitial = lastName.trim().charAt(0);

  return (
    `${firstInitial}${lastInitial}`.toUpperCase() || "U"
  );
}

export function UserProfileHeader({
  profile,
}: UserProfileHeaderProps) {
  const fullName =
    `${profile.firstName} ${profile.lastName}`.trim() ||
    profile.email;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-xl font-semibold text-cyan-300">
          {getInitials(
            profile.firstName,
            profile.lastName
          )}
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold text-white">
            {fullName}
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            {profile.companyName || "Company not assigned"}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-cyan-900 bg-cyan-950/40 px-3 py-1 text-xs font-medium text-cyan-300">
              {profile.role || "Role not assigned"}
            </span>

            <span
              className={
                profile.isActive
                  ? "rounded-full border border-emerald-900 bg-emerald-950/40 px-3 py-1 text-xs font-medium text-emerald-300"
                  : "rounded-full border border-red-900 bg-red-950/40 px-3 py-1 text-xs font-medium text-red-300"
              }
            >
              {profile.isActive ? "Active" : "Inactive"}
            </span>

            {profile.isSystemAdmin ? (
              <span className="rounded-full border border-purple-900 bg-purple-950/40 px-3 py-1 text-xs font-medium text-purple-300">
                System Administrator
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}