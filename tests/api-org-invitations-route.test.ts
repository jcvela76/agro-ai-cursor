import { beforeEach, describe, expect, it, vi } from "vitest";
import { inviteOrgId } from "./helpers/org-invite-route-mocks";

const authFn = vi.hoisted(() => vi.fn());
const seatSnapshot = vi.hoisted(() => vi.fn());
const createInvitation = vi.hoisted(() => vi.fn());

function mockAdminAuth(userId: string | null, orgId: string | null, isAdmin: boolean) {
  authFn.mockResolvedValue({
    userId,
    orgId,
    has: ({ role }: { role: string }) => isAdmin && role === "org:admin",
  });
}

vi.mock("@clerk/nextjs/server", () => ({
  auth: authFn,
  clerkClient: vi.fn(async () => ({
    organizations: {
      createOrganizationInvitation: createInvitation,
    },
  })),
}));

vi.mock("@/infrastructure/auth/clerk-org-member-limit-gateway", () => ({
  ClerkOrgMemberLimitGateway: class {
    getSeatSnapshot = seatSnapshot;
  },
}));

vi.mock("@/infrastructure/container", async () => {
  const { createInviteMetadataStore } = await import("./helpers/org-invite-route-mocks");
  return {
    createOrgMetadataStore: createInviteMetadataStore,
  };
});

import { POST } from "@/app/api/org/invitations/route";

describe("API /api/org/invitations", () => {
  beforeEach(() => {
    authFn.mockReset();
    seatSnapshot.mockReset();
    createInvitation.mockReset();
    createInvitation.mockResolvedValue({
      id: "orginv_test",
      emailAddress: "qa@example.com",
    });
  });

  it("POST returns 401 when unauthenticated", async () => {
    mockAdminAuth(null, null, false);
    const res = await POST(
      new Request("http://localhost/api/org/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emailAddress: "qa@example.com" }),
      }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.status).toBe("INVITE_DENIED");
  });

  it("POST returns 403 for non-admin member", async () => {
    mockAdminAuth("user_member", inviteOrgId, false);
    const res = await POST(
      new Request("http://localhost/api/org/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emailAddress: "qa@example.com" }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("POST returns 400 for invalid email", async () => {
    mockAdminAuth("user_admin", inviteOrgId, true);
    seatSnapshot.mockResolvedValue({ activeMembers: 1, pendingInvites: 0, maxAllowedMemberships: 2 });
    const res = await POST(
      new Request("http://localhost/api/org/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emailAddress: "not-an-email" }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("email");
  });

  it("POST returns 403 when member limit exceeded", async () => {
    mockAdminAuth("user_admin", inviteOrgId, true);
    seatSnapshot.mockResolvedValue({ activeMembers: 2, pendingInvites: 0, maxAllowedMemberships: 2 });
    const res = await POST(
      new Request("http://localhost/api/org/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emailAddress: "qa@example.com" }),
      }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.status).toBe("MEMBER_LIMIT_EXCEEDED");
    expect(createInvitation).not.toHaveBeenCalled();
  });

  it("POST creates invitation when under seat cap", async () => {
    mockAdminAuth("user_admin", inviteOrgId, true);
    seatSnapshot.mockResolvedValue({ activeMembers: 1, pendingInvites: 0, maxAllowedMemberships: 2 });
    const res = await POST(
      new Request("http://localhost/api/org/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emailAddress: "qa@example.com", role: "org:member" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(body.data.id).toBe("orginv_test");
    expect(createInvitation).toHaveBeenCalledOnce();
  });
});
