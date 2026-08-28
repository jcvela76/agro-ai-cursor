import { describe, expect, it } from "vitest";
import {
  parseOrganizationCreatedEvent,
  parseOrganizationInvitationCreatedEvent,
} from "@/application/billing/parse-organization-invitation-event";
import { EnforceOrgMemberLimitOnInvite } from "@/application/billing/enforce-org-member-limit-on-invite";
import { SyncOrgMemberLimit } from "@/application/billing/sync-org-member-limit";
import { MemoryOrgMetadataStore } from "@/infrastructure/auth/clerk-org-metadata-store";
import { MemoryOrgMemberLimitGateway } from "@/infrastructure/auth/clerk-org-member-limit-gateway";

describe("parseOrganizationInvitationCreatedEvent", () => {
  it("parses invitation created payload", () => {
    const parsed = parseOrganizationInvitationCreatedEvent("organizationInvitation.created", {
      id: "orginv_abc",
      organization_id: "org_test_001",
      inviter_user_id: "user_inviter",
    });
    expect(parsed).toEqual({
      orgId: "org_test_001",
      invitationId: "orginv_abc",
      inviterUserId: "user_inviter",
    });
  });

  it("ignores other event types", () => {
    expect(parseOrganizationInvitationCreatedEvent("organization.created", {})).toBeNull();
  });
});

describe("parseOrganizationCreatedEvent", () => {
  it("parses organization created payload", () => {
    expect(parseOrganizationCreatedEvent("organization.created", { id: "org_new" })).toEqual({
      orgId: "org_new",
    });
  });
});

describe("SyncOrgMemberLimit", () => {
  it("sets Clerk maxAllowedMemberships from billing plan slug", async () => {
    const store = new MemoryOrgMetadataStore({
      org_x: {
        entitlements: ["weather", "weather_plus"],
        authorizedParcelIds: [],
        billingPlanSlug: "weather_plus",
      },
    });
    const members = new MemoryOrgMemberLimitGateway();
    const sync = new SyncOrgMemberLimit(store, members);

    const result = await sync.execute("org_x");

    expect(result.limit).toBe(5);
    expect(members.maxLimits.get("org_x")).toBe(5);
  });
});

describe("EnforceOrgMemberLimitOnInvite", () => {
  it("revokes invitation when active + pending exceed plan cap", async () => {
    const store = new MemoryOrgMetadataStore({
      org_cap: {
        entitlements: ["weather"],
        authorizedParcelIds: [],
        billingPlanSlug: "free_org",
      },
    });
    const members = new MemoryOrgMemberLimitGateway();
    members.snapshots.set("org_cap", {
      activeMembers: 1,
      pendingInvites: 2,
      maxAllowedMemberships: 2,
    });

    const enforce = new EnforceOrgMemberLimitOnInvite(store, members);
    const result = await enforce.execute({
      orgId: "org_cap",
      invitationId: "orginv_over",
      inviterUserId: "user_admin",
    });

    expect(result).toEqual({ revoked: true, reason: "member_limit_exceeded" });
    expect(members.revoked).toEqual([
      {
        organizationId: "org_cap",
        invitationId: "orginv_over",
        requestingUserId: "user_admin",
      },
    ]);
  });

  it("allows invite under cap", async () => {
    const store = new MemoryOrgMetadataStore({
      org_ok: {
        entitlements: ["weather", "weather_plus"],
        authorizedParcelIds: [],
        billingPlanSlug: "weather_plus",
      },
    });
    const members = new MemoryOrgMemberLimitGateway();
    members.snapshots.set("org_ok", {
      activeMembers: 3,
      pendingInvites: 1,
      maxAllowedMemberships: 5,
    });

    const enforce = new EnforceOrgMemberLimitOnInvite(store, members);
    const result = await enforce.execute({
      orgId: "org_ok",
      invitationId: "orginv_ok",
      inviterUserId: "user_admin",
    });

    expect(result).toEqual({ revoked: false });
    expect(members.revoked).toHaveLength(0);
  });
});
