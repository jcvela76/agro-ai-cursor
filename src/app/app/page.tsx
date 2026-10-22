import { auth } from "@clerk/nextjs/server";
import { AppShellLoader } from "@/ui/app-shell-loader";
import { FreeOrgOnboarding } from "@/ui/free-org-onboarding";

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ parcel?: string; tab?: string }>;
}) {
  const { userId, orgId } = await auth();
  if (userId && !orgId) {
    return <FreeOrgOnboarding />;
  }

  const params = await searchParams;
  return (
    <AppShellLoader
      initialParcelId={params.parcel ?? null}
      initialTab={params.tab ?? null}
    />
  );
}
