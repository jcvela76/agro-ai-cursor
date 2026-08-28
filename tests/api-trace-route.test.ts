import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSyntheticSnapshots } from "./helpers/trace-route-mocks";

const authFn = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authFn,
}));

vi.mock("@/infrastructure/container", async () => {
  const { traceRouteContainerMock } = await import("./helpers/trace-route-mocks");
  return traceRouteContainerMock;
});

import { GET as listLots, POST as createLot } from "@/app/api/trace/lots/route";
import { PATCH as patchLot } from "@/app/api/trace/lots/[lotId]/route";
import { POST as appendEvent } from "@/app/api/trace/lots/[lotId]/events/route";

const entitled = defaultSyntheticSnapshots.find((s) => s.userId === "user-trace-007")!;
const weatherOnly = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-agronomist-001",
)!;

function mockAuth(userId: string | null, orgIdValue: string | null) {
  authFn.mockResolvedValue({ userId, orgId: orgIdValue });
}

describe("API /api/trace/lots", () => {
  beforeEach(() => {
    authFn.mockReset();
  });

  it("GET returns 401 when unauthenticated", async () => {
    mockAuth(null, null);
    const res = await listLots();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.status).toBe("TRACE_UNAVAILABLE");
    expect(body.reason).toBe("unauthenticated");
  });

  it("GET returns 403 without traceability entitlement", async () => {
    mockAuth(weatherOnly.userId, weatherOnly.orgId);
    const res = await listLots();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.reason).toBe("missing_traceability_entitlement");
  });

  it("GET returns fixtures for entitled user", async () => {
    mockAuth(entitled.userId, entitled.orgId);
    const res = await listLots();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(body.data.length).toBeGreaterThanOrEqual(2);
    expect(body.data[0].lot.cropType).toBe("coffee");
  });

  it("POST → PATCH → event lifecycle", async () => {
    mockAuth(entitled.userId, entitled.orgId);

    const createRes = await createLot(
      new Request("http://localhost/api/trace/lots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "API smoke lot",
          harvestSeason: "2026",
          producerName: "API Producer",
          parcelId: "parcel-lima-norte-001",
        }),
      }),
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    const lotId = created.data.lot.id as string;

    const patchRes = await patchLot(
      new Request(`http://localhost/api/trace/lots/${lotId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          countryOfProduction: "PE",
          productionEndDate: "2026-08-01",
          deforestationFreeDeclared: true,
        }),
      }),
      { params: Promise.resolve({ lotId }) },
    );
    expect(patchRes.status).toBe(200);

    const eventRes = await appendEvent(
      new Request(`http://localhost/api/trace/lots/${lotId}/events`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          eventType: "harvested",
          occurredAt: "2026-08-20T10:00:00-05:00",
        }),
      }),
      { params: Promise.resolve({ lotId }) },
    );
    expect(eventRes.status).toBe(201);
    const eventBody = await eventRes.json();
    expect(eventBody.data.events.some((e: { eventType: string }) => e.eventType === "harvested")).toBe(
      true,
    );
  });

  it("POST event returns 400 when EUDR incomplete for export", async () => {
    mockAuth(entitled.userId, entitled.orgId);

    const createRes = await createLot(
      new Request("http://localhost/api/trace/lots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "API incomplete lot",
          harvestSeason: "2026",
          producerName: "API Producer",
          deforestationFreeDeclared: false,
        }),
      }),
    );
    const created = await createRes.json();
    const lotId = created.data.lot.id as string;

    const res = await appendEvent(
      new Request(`http://localhost/api/trace/lots/${lotId}/events`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          eventType: "exported",
          occurredAt: "2026-08-27T12:00:00-05:00",
        }),
      }),
      { params: Promise.resolve({ lotId }) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.reason).toBe("eudr_incomplete");
  });

  it("POST create returns 403 without traceability entitlement", async () => {
    mockAuth(weatherOnly.userId, weatherOnly.orgId);
    const res = await createLot(
      new Request("http://localhost/api/trace/lots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Denied",
          harvestSeason: "2026",
          producerName: "X",
        }),
      }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.reason).toBe("missing_traceability_entitlement");
  });
});
