import AppShell from "@/components/AppShell";
import { AuthorizedUserProfileEditPage } from "@/features/users/components/AuthorizedUserProfileEditPage";

type EditUserProfilePageProps = {
  params: Promise<{
    userId: string;
  }>;
};

export default async function EditUserProfilePage({
  params,
}: EditUserProfilePageProps) {
  const { userId } = await params;

  return (
    <AppShell>
      <div className="p-8">
        <AuthorizedUserProfileEditPage
          userId={userId}
        />
      </div>
    </AppShell>
  );
}