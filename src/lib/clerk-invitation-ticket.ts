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
