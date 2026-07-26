import AppShell from "@/components/AppShell";
import { AuthorizedUserProfilePage } from "@/features/users/components/AuthorizedUserProfilePage";

type UserProfilePageProps = {
  params: Promise<{
    userId: string;
  }>;
};

export default async function UserProfilePage({
  params,
}: UserProfilePageProps) {
  const { userId } = await params;

  return (
    <AppShell>
      <div className="p-8">
        <AuthorizedUserProfilePage
          userId={userId}
        />
      </div>
    </AppShell>
  );
}