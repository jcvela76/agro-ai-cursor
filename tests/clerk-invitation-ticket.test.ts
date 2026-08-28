import { describe, expect, it } from "vitest";
import { parseInvitationOrgId } from "@/lib/clerk-invitation-ticket";

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
