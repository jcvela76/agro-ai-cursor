import { AppShellLoader } from "@/ui/app-shell-loader";

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ parcel?: string; tab?: string }>;
}) {
  const params = await searchParams;
  return (
    <AppShellLoader
      initialParcelId={params.parcel ?? null}
      initialTab={params.tab ?? null}
    />
  );
}
