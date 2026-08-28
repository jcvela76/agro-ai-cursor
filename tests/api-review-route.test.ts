import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSyntheticSnapshots } from "./helpers/review-route-mocks";

const authFn = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authFn,
}));

vi.mock("@/infrastructure/container", async () => {
  const { reviewRouteContainerMock } = await import("./helpers/review-route-mocks");
  return reviewRouteContainerMock;
});

import { GET, POST } from "@/app/api/review/decisions/route";

const parcelId = "parcel-lima-norte-001";
const entitled = defaultSyntheticSnapshots.find((s) => s.userId === "user-review-008")!;
const weatherOnly = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-agronomist-001",
)!;

function mockAuth(userId: string | null, orgId: string | null) {
  authFn.mockResolvedValue({ userId, orgId });
}

describe("API /api/review/decisions", () => {
  beforeEach(() => {
    authFn.mockReset();
  });

  it("GET returns 401 when unauthenticated", async () => {
    mockAuth(null, null);
    const res = await GET(new Request("http://localhost/api/review/decisions"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.status).toBe("REVIEW_UNAVAILABLE");
    expect(body.reason).toBe("unauthenticated");
  });

  it("GET returns 403 without agronomic_review entitlement", async () => {
    mockAuth(weatherOnly.userId, weatherOnly.orgId);
    const res = await GET(
      new Request(`http://localhost/api/review/decisions?parcelId=${parcelId}`),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.reason).toBe("missing_agronomic_review_entitlement");
  });

  it("GET returns decisions for entitled user filtered by parcel", async () => {
    mockAuth(entitled.userId, entitled.orgId);
    const res = await GET(
      new Request(`http://localhost/api/review/decisions?parcelId=${parcelId}`),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("POST appends decision and GET includes it", async () => {
    mockAuth(entitled.userId, entitled.orgId);

    const createRes = await POST(
      new Request("http://localhost/api/review/decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          parcelId,
          kind: "observe",
          summary: "API smoke review observation",
          rationale: "QA-6 route test append.",
          evidenceRef: "synthetic://api-smoke-review",
        }),
      }),
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.status).toBe("OK");
    expect(created.data.kind).toBe("observe");
    expect(created.data.parcelId).toBe(parcelId);

    const listRes = await GET(
      new Request(`http://localhost/api/review/decisions?parcelId=${parcelId}`),
    );
    const listed = await listRes.json();
    expect(
      listed.data.some(
        (d: { id: string }) => d.id === created.data.id,
      ),
    ).toBe(true);
  });

  it("POST returns 403 without agronomic_review entitlement", async () => {
    mockAuth(weatherOnly.userId, weatherOnly.orgId);
    const res = await POST(
      new Request("http://localhost/api/review/decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          parcelId,
          kind: "observe",
          summary: "Denied",
          rationale: "Denied",
        }),
      }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.reason).toBe("missing_agronomic_review_entitlement");
  });

  it("POST returns 400 for invalid kind", async () => {
    mockAuth(entitled.userId, entitled.orgId);
    const res = await POST(
      new Request("http://localhost/api/review/decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          parcelId,
          kind: "approve",
          summary: "Bad",
          rationale: "Bad",
        }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.reason).toBe("invalid_input");
  });

  it("POST returns 403 for cross-org parcel", async () => {
    mockAuth(entitled.userId, entitled.orgId);
    const res = await POST(
      new Request("http://localhost/api/review/decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          parcelId: "parcel-does-not-exist",
          kind: "observe",
          summary: "Bad parcel",
          rationale: "Bad parcel",
        }),
      }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.reason).toBe("cross_org_parcel");
  });
});
