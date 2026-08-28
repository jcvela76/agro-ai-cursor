import { beforeEach, describe, expect, it, vi } from "vitest";
import { workspaceOrgId } from "./helpers/workspace-route-mocks";

const authFn = vi.hoisted(() => vi.fn());

function mockAdminAuth(userId: string | null, orgId: string | null, isAdmin: boolean) {
  authFn.mockResolvedValue({
    userId,
    orgId,
    has: ({ role }: { role: string }) => isAdmin && role === "org:admin",
  });
}

vi.mock("@clerk/nextjs/server", () => ({
  auth: authFn,
}));

vi.mock("@/infrastructure/container", async () => {
  const { workspaceRouteContainerMock } = await import("./helpers/workspace-route-mocks");
  return workspaceRouteContainerMock;
});

import { GET, PATCH } from "@/app/api/workspace/settings/route";

describe("API /api/workspace/settings", () => {
  beforeEach(() => {
    authFn.mockReset();
  });

  it("GET returns 401 when unauthenticated", async () => {
    mockAdminAuth(null, null, false);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.status).toBe("WORKSPACE_SETTINGS_DENIED");
  });

  it("GET returns 403 for non-admin member", async () => {
    mockAdminAuth("user_member", workspaceOrgId, false);
    const res = await GET();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toContain("admin");
  });

  it("GET returns workspace settings for org admin", async () => {
    mockAdminAuth("user_admin", workspaceOrgId, true);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(body.data.entitlements).toEqual(["weather"]);
    expect(body.data.billingPlanSlug).toBe("free_org");
  });

  it("PATCH updates entitlements and parcel allowlist", async () => {
    mockAdminAuth("user_admin", workspaceOrgId, true);
    const res = await PATCH(
      new Request("http://localhost/api/workspace/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entitlements: ["weather", "weather_plus"],
          authorizedParcelIds: ["parcel-a", "parcel-a"],
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.entitlements).toEqual(["weather", "weather_plus"]);
    expect(body.data.authorizedParcelIds).toEqual(["parcel-a"]);
  });
});
