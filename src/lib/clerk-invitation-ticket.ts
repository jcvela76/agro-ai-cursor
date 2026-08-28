/**
 * Clerk org-invitation tickets are JWTs with the target organization id in `oid`.
 */
export function parseInvitationOrgId(ticket: string): string | null {
  const parts = ticket.split(".");
  if (parts.length < 2) {
    return null;
  }
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))) as {
      oid?: unknown;
    };
    return typeof payload.oid === "string" ? payload.oid : null;
  } catch {
    return null;
  }
}

export function invitationContinueUrl(
  ticket: string | null,
  accountStatus: string | null,
): string {
  if (!ticket) {
    return "/accept-invitation";
  }
  const params = new URLSearchParams({ __clerk_ticket: ticket });
  if (accountStatus) {
    params.set("__clerk_status", accountStatus);
  }
  return `/accept-invitation?${params.toString()}`;
}

export function hasClerkInvitationParams(searchParams: URLSearchParams): boolean {
  return searchParams.has("__clerk_ticket") || searchParams.has("__clerk_status");
}
