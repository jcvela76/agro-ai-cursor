import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoParcelSquare } from "@/domain/parcel/geometry";
import {
  defaultSyntheticSnapshots,
} from "./helpers/parcel-route-mocks";

const authFn = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authFn,
}));

vi.mock("@/infrastructure/container", async () => {
  const { parcelRouteContainerMock } = await import("./helpers/parcel-route-mocks");
  return parcelRouteContainerMock;
});

import { GET, POST } from "@/app/api/parcels/route";
import { DELETE, PATCH } from "@/app/api/parcels/[parcelId]/route";

const orgWide = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-org-wide-weather-006",
)!;
const crossOrg = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-cross-ws-004",
)!;

function mockAuth(userId: string | null, orgId: string | null) {
  authFn.mockResolvedValue({ userId, orgId });
}

describe("API /api/parcels", () => {
  beforeEach(() => {
    authFn.mockReset();
  });

  it("GET returns 401 when unauthenticated", async () => {
    mockAuth(null, null);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.status).toBe("PARCEL_LIST_DENIED");
  });

  it("POST → PATCH → DELETE lifecycle", async () => {
    mockAuth(orgWide.userId, orgWide.orgId);

    const createRes = await POST(
      new Request("http://localhost/api/parcels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "API smoke parcel",
          geometry: demoParcelSquare(-77.04, -11.94),
        }),
      }),
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.status).toBe("OK");
    const parcelId = created.data.id as string;

    const listRes = await GET();
    expect(listRes.status).toBe(200);
    const listed = await listRes.json();
    expect(listed.data.some((p: { id: string }) => p.id === parcelId)).toBe(true);

    const patchRes = await PATCH(
      new Request(`http://localhost/api/parcels/${parcelId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "API smoke parcel (renamed)" }),
      }),
      { params: Promise.resolve({ parcelId }) },
    );
    expect(patchRes.status).toBe(200);
    const patched = await patchRes.json();
    expect(patched.data.name).toBe("API smoke parcel (renamed)");

    const deleteRes = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ parcelId }),
    });
    expect(deleteRes.status).toBe(200);

    const listAfter = await GET();
    const afterBody = await listAfter.json();
    expect(afterBody.data.some((p: { id: string }) => p.id === parcelId)).toBe(false);
  });

  it("PATCH returns 404 for cross-org parcel", async () => {
    mockAuth(crossOrg.userId, crossOrg.orgId);
    const res = await PATCH(
      new Request("http://localhost/api/parcels/parcel-lima-norte-001", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Hack" }),
      }),
      { params: Promise.resolve({ parcelId: "parcel-lima-norte-001" }) },
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.reason).toBe("not_found");
  });

  it("POST returns 400 for invalid geometry", async () => {
    mockAuth(orgWide.userId, orgWide.orgId);
    const res = await POST(
      new Request("http://localhost/api/parcels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Bad",
          geometry: { type: "Point", coordinates: [0, 0] },
        }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
