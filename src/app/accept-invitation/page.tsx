"use client";

import { SignIn, SignUp, useAuth, useOrganization, useSignIn, useSignUp } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type CSSProperties } from "react";

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
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { signUp, fetchStatus: signUpFetch } = useSignUp();
  const { signIn, fetchStatus: signInFetch } = useSignIn();

  const ticket = searchParams.get("__clerk_ticket");
  const accountStatus = searchParams.get("__clerk_status");

  const [phase, setPhase] = useState<Phase>("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (!ticket || !authLoaded || !orgLoaded) {
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
    if (attempted.current || !signUp || !signIn) {
      return;
    }
    if (signUpFetch === "fetching" || signInFetch === "fetching") {
      return;
    }

    attempted.current = true;

    async function finalizeSignIn() {
      if (signIn?.status !== "complete") {
        setPhase("sign_in_ui");
        return;
      }
      await signIn.finalize({ navigate: navigateToApp(router) });
    }

    async function finalizeSignUp() {
      if (signUp?.status !== "complete") {
        setPhase("sign_up_ui");
        return;
      }
      await signUp.finalize({ navigate: navigateToApp(router) });
    }

    async function consumeWithSignIn() {
      const { error } = await signIn!.ticket({ ticket: ticket! });
      if (error) {
        setErrorMessage("No se pudo aceptar la invitación con esta cuenta.");
        setPhase("error");
        return;
      }
      await finalizeSignIn();
    }

    async function consumeWithSignUp() {
      const { error } = await signUp!.ticket({ ticket: ticket! });
      if (error) {
        await consumeWithSignIn();
        return;
      }
      if (signUp!.status === "missing_requirements") {
        setPhase("sign_up_ui");
        return;
      }
      await finalizeSignUp();
    }

    async function consumeTicket() {
      try {
        if (isSignedIn || accountStatus === "sign_in") {
          await consumeWithSignIn();
          return;
        }
        await consumeWithSignUp();
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
    organization,
    isSignedIn,
    signUp,
    signIn,
    signUpFetch,
    signInFetch,
    router,
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
        <p>{errorMessage ?? "No se pudo procesar la invitación."}</p>
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
