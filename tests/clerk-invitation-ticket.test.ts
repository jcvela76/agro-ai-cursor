import { describe, expect, it } from "vitest";
import {
  hasClerkInvitationParams,
  invitationContinueUrl,
  parseInvitationOrgId,
} from "@/lib/clerk-invitation-ticket";

describe("parseInvitationOrgId", () => {
  it("extracts oid from invitation ticket payload", () => {
    const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ oid: "org_123", st: "organization_invitation" }));
    const ticket = `${header}.${payload}.signature`;

    expect(parseInvitationOrgId(ticket)).toBe("org_123");
  });

  it("returns null for invalid tickets", () => {
    expect(parseInvitationOrgId("not-a-jwt")).toBeNull();
  });
});

describe("invitationContinueUrl", () => {
  it("preserves ticket and status for SignIn redirect", () => {
    expect(invitationContinueUrl("ticket.jwt.here", "sign_in")).toBe(
      "/accept-invitation?__clerk_ticket=ticket.jwt.here&__clerk_status=sign_in",
    );
  });
});

describe("hasClerkInvitationParams", () => {
  it("detects clerk invitation query params", () => {
    expect(hasClerkInvitationParams(new URLSearchParams("__clerk_status=sign_in"))).toBe(true);
    expect(hasClerkInvitationParams(new URLSearchParams())).toBe(false);
  });
});
