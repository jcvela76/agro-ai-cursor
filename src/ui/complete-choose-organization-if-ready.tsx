"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

/**
 * Clerk a veces deja la sesión `pending` con task `choose-organization`
 * aunque ya hay `lastActiveOrganizationId` (p. ej. tras CreateOrganization).
 * Un `session.touch()` completa la task; sin eso el middleware bloquea `/app`.
 */
export function CompleteChooseOrganizationIfReady() {
  const { session, isLoaded } = useSession();
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (!isLoaded || !session || ran.current) return;
    if (session.status !== "pending") return;
    if (session.currentTask?.key !== "choose-organization") return;
    if (!session.lastActiveOrganizationId) return;

    ran.current = true;
    let cancelled = false;
    void (async () => {
      try {
        await session.touch();
        if (!cancelled) router.replace("/app");
      } catch {
        ran.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, session, router]);

  return null;
}
