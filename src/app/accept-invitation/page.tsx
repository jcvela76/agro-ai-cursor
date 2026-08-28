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
import {
  invitationContinueUrl,
  parseInvitationOrgId,
} from "@/lib/clerk-invitation-ticket";
import { Button } from "@/ui/button";

const shellStyle: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "2rem",
};

type Phase = "processing" | "sign_up_ui" | "sign_in_ui" | "error";

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
  const continueUrl = invitationContinueUrl(ticket, accountStatus);

  const [phase, setPhase] = useState<Phase>("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const attempted = useRef(false);
  const noTicketAttempted = useRef(false);

  async function goToApp() {
    router.replace("/app");
  }

  async function activateMembership(orgId: string) {
    await setActive!({ organization: orgId });
    await goToApp();
    return true;
  }

  async function activateExistingMembership() {
    if (invitedOrgId) {
      const invited = userMemberships.data?.find(
        (item) => item.organization.id === invitedOrgId,
      );
      if (invited) {
        return activateMembership(invitedOrgId);
      }
    }

    const memberships = userMemberships.data ?? [];
    if (memberships.length === 1) {
      return activateMembership(memberships[0].organization.id);
    }

    return false;
  }

  // Signed in after SignIn, but Clerk dropped __clerk_ticket from the URL.
  useEffect(() => {
    if (ticket || !authLoaded || !orgLoaded || !orgListLoaded || !isSignedIn) {
      return;
    }
    if (organization) {
      void goToApp();
      return;
    }
    if (noTicketAttempted.current) {
      return;
    }
    noTicketAttempted.current = true;

    void (async () => {
      if (await activateExistingMembership()) {
        return;
      }
      setErrorMessage(
        "Iniciaste sesión pero no encontramos la organización. Pide una invitación nueva al administrador.",
      );
      setPhase("error");
    })();
  }, [
    ticket,
    authLoaded,
    orgLoaded,
    orgListLoaded,
    isSignedIn,
    organization,
    invitedOrgId,
    userMemberships.data,
    setActive,
  ]);

  useEffect(() => {
    if (!ticket || !authLoaded || !orgLoaded || !orgListLoaded) {
      return;
    }
    if (organization) {
      void goToApp();
      return;
    }
    if (accountStatus === "complete") {
      void goToApp();
      return;
    }
    if (attempted.current || !signUp || !signIn || !setActive) {
      return;
    }
    if (signUpFetch === "fetching" || signInFetch === "fetching") {
      return;
    }

    attempted.current = true;

    async function finalizeSignIn() {
      if (signIn?.status !== "complete") {
        setPhase("sign_in_ui");
        return true;
      }
      await signIn.finalize({
        navigate: async () => {
          await goToApp();
        },
      });
      return true;
    }

    async function finalizeSignUp() {
      if (signUp?.status !== "complete") {
        setPhase("sign_up_ui");
        return true;
      }
      await signUp.finalize({
        navigate: async () => {
          await goToApp();
        },
      });
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
    clerk,
    invitedOrgId,
    setActive,
    userMemberships.data,
  ]);

  if (!ticket && !isSignedIn) {
    return (
      <main style={shellStyle}>
        <p>Enlace de invitación inválido o expirado.</p>
      </main>
    );
  }

  if (!ticket && isSignedIn) {
    return (
      <main style={shellStyle}>
        <p>Activando organización…</p>
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
        <SignIn fallbackRedirectUrl={continueUrl} forceRedirectUrl={continueUrl} />
      </main>
    );
  }

  if (phase === "sign_up_ui") {
    return (
      <main style={shellStyle}>
        <SignUp fallbackRedirectUrl={continueUrl} forceRedirectUrl={continueUrl} />
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
