"use client";

import {
  SignIn,
  SignUp,
  useAuth,
  useClerk,
  useOrganization,
  useOrganizationList,
  useSignIn,
  useSignUp,
} from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type CSSProperties } from "react";
import { parseInvitationOrgId } from "@/lib/clerk-invitation-ticket";
import { Button } from "@/ui/button";

const shellStyle: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "2rem",
};

type Phase = "processing" | "sign_up_ui" | "sign_in_ui" | "error";

function navigateToApp(router: ReturnType<typeof useRouter>) {
  return ({ decorateUrl }: { decorateUrl: (path: string) => string }) => {
    const url = decorateUrl("/app");
    if (url.startsWith("http")) {
      window.location.href = url;
      return;
    }
    router.replace(url);
  };
}

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clerk = useClerk();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { setActive, userMemberships, isLoaded: orgListLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const { signUp, fetchStatus: signUpFetch } = useSignUp();
  const { signIn, fetchStatus: signInFetch } = useSignIn();

  const ticket = searchParams.get("__clerk_ticket");
  const accountStatus = searchParams.get("__clerk_status");
  const invitedOrgId = ticket ? parseInvitationOrgId(ticket) : null;

  const [phase, setPhase] = useState<Phase>("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (!ticket || !authLoaded || !orgLoaded || !orgListLoaded) {
      return;
    }
    if (organization) {
      router.replace("/app");
      return;
    }
    if (accountStatus === "complete") {
      router.replace("/app");
      return;
    }
    if (attempted.current || !signUp || !signIn || !setActive) {
      return;
    }
    if (signUpFetch === "fetching" || signInFetch === "fetching") {
      return;
    }

    attempted.current = true;

    async function activateExistingMembership() {
      if (!invitedOrgId) {
        return false;
      }
      const membership = userMemberships.data?.find(
        (item) => item.organization.id === invitedOrgId,
      );
      if (!membership) {
        return false;
      }
      await setActive!({ organization: invitedOrgId });
      router.replace("/app");
      return true;
    }

    async function finalizeSignIn() {
      if (signIn?.status !== "complete") {
        setPhase("sign_in_ui");
        return true;
      }
      await signIn.finalize({ navigate: navigateToApp(router) });
      return true;
    }

    async function finalizeSignUp() {
      if (signUp?.status !== "complete") {
        setPhase("sign_up_ui");
        return true;
      }
      await signUp.finalize({ navigate: navigateToApp(router) });
      return true;
    }

    async function consumeWithSignIn(requireSignOut: boolean) {
      if (requireSignOut && isSignedIn) {
        await clerk.signOut();
      }
      const { error } = await signIn!.ticket({ ticket: ticket! });
      if (error) {
        return false;
      }
      return finalizeSignIn();
    }

    async function consumeWithSignUp() {
      if (isSignedIn) {
        return false;
      }
      const { error } = await signUp!.ticket({ ticket: ticket! });
      if (error) {
        return false;
      }
      if (signUp!.status === "missing_requirements") {
        setPhase("sign_up_ui");
        return true;
      }
      return finalizeSignUp();
    }

    async function consumeTicket() {
      try {
        if (await activateExistingMembership()) {
          return;
        }

        // After Account Portal sign-up, URL may still say sign_up while user exists.
        const preferSignIn =
          accountStatus === "sign_in" || (accountStatus === "sign_up" && isSignedIn);

        if (preferSignIn) {
          if (await consumeWithSignIn(true)) {
            return;
          }
          if (await consumeWithSignUp()) {
            return;
          }
        } else {
          if (await consumeWithSignUp()) {
            return;
          }
          if (await consumeWithSignIn(true)) {
            return;
          }
        }

        if (await activateExistingMembership()) {
          return;
        }

        setErrorMessage(
          "No se pudo aceptar la invitación. Cierra sesión, abre el enlace de nuevo o pide una invitación nueva.",
        );
        setPhase("error");
      } catch {
        setErrorMessage("No se pudo aceptar la invitación. Pide una nueva invitación al administrador.");
        setPhase("error");
      }
    }

    void consumeTicket();
  }, [
    ticket,
    accountStatus,
    authLoaded,
    orgLoaded,
    orgListLoaded,
    organization,
    isSignedIn,
    signUp,
    signIn,
    signUpFetch,
    signInFetch,
    router,
    clerk,
    invitedOrgId,
    setActive,
    userMemberships.data,
  ]);

  if (!ticket) {
    return (
      <main style={shellStyle}>
        <p>Enlace de invitación inválido o expirado.</p>
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main style={shellStyle}>
        <div style={{ display: "grid", gap: "1rem", maxWidth: "28rem", textAlign: "center" }}>
          <p>{errorMessage ?? "No se pudo procesar la invitación."}</p>
          <Button type="button" onClick={() => void clerk.signOut(() => router.refresh())}>
            Cerrar sesión e intentar de nuevo
          </Button>
        </div>
      </main>
    );
  }

  if (phase === "sign_in_ui") {
    return (
      <main style={shellStyle}>
        <SignIn fallbackRedirectUrl="/app" />
      </main>
    );
  }

  if (phase === "sign_up_ui") {
    return (
      <main style={shellStyle}>
        <SignUp fallbackRedirectUrl="/app" />
      </main>
    );
  }

  return (
    <main style={shellStyle}>
      <p>Procesando invitación…</p>
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
