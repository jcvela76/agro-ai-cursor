"use client";

import { SignIn, SignUp, useAuth, useOrganization } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, type CSSProperties } from "react";

const shellStyle: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "2rem",
};

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { organization, isLoaded: orgLoaded } = useOrganization();

  const ticket = searchParams.get("__clerk_ticket");
  const accountStatus = searchParams.get("__clerk_status");

  useEffect(() => {
    if (!authLoaded || !orgLoaded) {
      return;
    }
    if (accountStatus === "complete" || (isSignedIn && organization)) {
      router.replace("/app");
    }
  }, [accountStatus, authLoaded, isSignedIn, orgLoaded, organization, router]);

  if (!ticket) {
    return (
      <main style={shellStyle}>
        <p>Enlace de invitación inválido o expirado.</p>
      </main>
    );
  }

  if (accountStatus === "complete") {
    return (
      <main style={shellStyle}>
        <p>Redirigiendo a la aplicación…</p>
      </main>
    );
  }

  if (accountStatus === "sign_in") {
    return (
      <main style={shellStyle}>
        <SignIn fallbackRedirectUrl="/app" />
      </main>
    );
  }

  return (
    <main style={shellStyle}>
      <SignUp fallbackRedirectUrl="/app" />
    </main>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <main style={shellStyle}>
          <p>Procesando invitación…</p>
        </main>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
