import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSyntheticSnapshots } from "./helpers/spectral-route-mocks";

const authFn = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authFn,
}));

vi.mock("@/infrastructure/container", async () => {
  const { spectralRouteContainerMock } = await import("./helpers/spectral-route-mocks");
  return spectralRouteContainerMock;
});

import { GET as getIndices } from "@/app/api/parcels/[parcelId]/spectral/indices/route";
import { GET as getOverlay } from "@/app/api/parcels/[parcelId]/spectral/overlay/route";
import { GET as getZones } from "@/app/api/parcels/[parcelId]/spectral/zones/route";
import { GET as getHistory } from "@/app/api/parcels/[parcelId]/spectral/history/route";

const parcelId = "parcel-lima-norte-001";
const weatherOnly = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-agronomist-001",
)!;
const weatherPlus = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-plus-005",
)!;
const crossOrg = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-cross-ws-004",
)!;

function mockAuth(userId: string | null, orgId: string | null) {
  authFn.mockResolvedValue({ userId, orgId });
}

const params = { params: Promise.resolve({ parcelId }) };

describe("API /api/parcels/[parcelId]/spectral", () => {
  beforeEach(() => {
    authFn.mockReset();
  });

  it("indices returns 404 when unauthenticated", async () => {
    mockAuth(null, null);
    const res = await getIndices(new Request("http://localhost"), params);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.status).toBe("SPECTRAL_LIMITED");
    expect(body.reason).toBe("unavailable");
  });

  it("indices returns 404 without weather_plus", async () => {
    mockAuth(weatherOnly.userId, weatherOnly.orgId);
    const res = await getIndices(new Request("http://localhost"), params);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toContain("Plus");
  });

  it("indices returns 200 with eight indices for Plus user", async () => {
    mockAuth(weatherPlus.userId, weatherPlus.orgId);
    const res = await getIndices(new Request("http://localhost"), params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(body.data.indices).toHaveLength(8);
    expect(body.data.indices[0].id).toBe("ndre");
    expect(body.data.evidence.satelliteMission).toBe("Sentinel-2");
  });

  it("overlay returns 200 with grid for Plus user", async () => {
    mockAuth(weatherPlus.userId, weatherPlus.orgId);
    const res = await getOverlay(
      new Request(`http://localhost/api/parcels/${parcelId}/spectral/overlay?index=ndre`),
      params,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(body.data.kind).toBe("spectral_overlay");
    expect(body.data.indexId).toBe("ndre");
    expect(body.data.grid.features.length).toBeGreaterThan(0);
  });

  it("overlay returns 404 for invalid index query", async () => {
    mockAuth(weatherPlus.userId, weatherPlus.orgId);
    const res = await getOverlay(
      new Request(`http://localhost/api/parcels/${parcelId}/spectral/overlay?index=not-an-index`),
      params,
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("Invalid vegetation index.");
  });

  it("zones returns 200 with relative tiers for Plus user", async () => {
    mockAuth(weatherPlus.userId, weatherPlus.orgId);
    const res = await getZones(
      new Request(`http://localhost/api/parcels/${parcelId}/spectral/zones?index=evi`),
      params,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(body.data.kind).toBe("spectral_zones");
    expect(body.data.indexId).toBe("evi");
    expect(body.data.zones.length).toBeGreaterThanOrEqual(1);
    expect(["low", "mid", "high"]).toContain(body.data.zones[0].tier);
  });

  it("history returns scenes after indices upsert", async () => {
    mockAuth(weatherPlus.userId, weatherPlus.orgId);
    await getIndices(new Request("http://localhost"), params);
    const res = await getHistory(
      new Request(`http://localhost/api/parcels/${parcelId}/spectral/history?days=90`),
      params,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(body.data.kind).toBe("spectral_history");
    expect(body.data.scenes.length).toBeGreaterThanOrEqual(1);
  });

  it("indices returns 404 for cross-org parcel", async () => {
    mockAuth(crossOrg.userId, crossOrg.orgId);
    const res = await getIndices(new Request("http://localhost"), params);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.reason).toBe("unavailable");
  });
});
