"use client";

import dynamic from "next/dynamic";

const AppShell = dynamic(
  () => import("@/ui/app-shell").then((m) => m.AppShell),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#c5d4c8",
          color: "#1c2a1f",
        }}
      >
        Cargando mapa…
      </div>
    ),
  },
);

export function AppShellLoader({
  initialParcelId,
}: {
  initialParcelId: string | null;
}) {
  return <AppShell initialParcelId={initialParcelId} />;
}
