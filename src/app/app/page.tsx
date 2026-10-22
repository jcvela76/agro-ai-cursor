import { auth } from "@clerk/nextjs/server";
import { resolveWorkspaceCapabilities } from "@/domain/auth/workspace-capabilities";
import { createAccessResolver } from "@/infrastructure/container";
import { AppShellLoader } from "@/ui/app-shell-loader";
import { FreeOrgOnboarding } from "@/ui/free-org-onboarding";

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ parcel?: string; tab?: string }>;
}) {
  const { userId, orgId, has } = await auth();
  if (userId && !orgId) {
    return <FreeOrgOnboarding />;
  }

  const params = await searchParams;
  const isAdmin = Boolean(has?.({ role: "org:admin" }));
  const authority =
    userId && orgId ? await createAccessResolver().resolve(userId, orgId) : null;
  const capabilities = resolveWorkspaceCapabilities(authority, isAdmin);

  return (
    <AppShellLoader
      initialParcelId={params.parcel ?? null}
      initialTab={params.tab ?? null}
      capabilities={capabilities}
    />
  );
}
