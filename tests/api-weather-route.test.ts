import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSyntheticSnapshots } from "./helpers/weather-route-mocks";

const authFn = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authFn,
}));

vi.mock("@/infrastructure/container", async () => {
  const { weatherRouteContainerMock } = await import("./helpers/weather-route-mocks");
  return weatherRouteContainerMock;
});

import { GET as getObservation } from "@/app/api/parcels/[parcelId]/weather/observation/route";
import { GET as getForecast } from "@/app/api/parcels/[parcelId]/weather/forecast/route";

const parcelId = "parcel-lima-norte-001";
const entitled = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-org-wide-weather-006",
)!;
const noWeather = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-parcel-only-003",
)!;
const crossOrg = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-cross-ws-004",
)!;

function mockAuth(userId: string | null, orgId: string | null) {
  authFn.mockResolvedValue({ userId, orgId });
}

const params = { params: Promise.resolve({ parcelId }) };

describe("API /api/parcels/[parcelId]/weather", () => {
  beforeEach(() => {
    authFn.mockReset();
  });

  it("observation returns 404 when unauthenticated", async () => {
    mockAuth(null, null);
    const res = await getObservation(new Request("http://localhost"), params);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.status).toBe("WEATHER_LIMITED");
    expect(body.reason).toBe("unavailable");
  });

  it("observation returns 200 with evidence for entitled user", async () => {
    mockAuth(entitled.userId, entitled.orgId);
    const res = await getObservation(new Request("http://localhost"), params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(body.data.temperatureCelsius).toBe(22.4);
    expect(body.data.relativeHumidityPercent).toBe(65);
    expect(body.data.windSpeedMetersPerSecond).toBe(2.5);
    expect(body.data.evidence.freshnessStatus).toBe("fresh");
  });

  it("forecast returns 200 with days for entitled user", async () => {
    mockAuth(entitled.userId, entitled.orgId);
    const res = await getForecast(new Request("http://localhost"), params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(body.data.days.length).toBeGreaterThanOrEqual(2);
  });

  it("observation returns 404 without weather entitlement", async () => {
    mockAuth(noWeather.userId, noWeather.orgId);
    const res = await getObservation(new Request("http://localhost"), params);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.reason).toBe("unavailable");
  });

  it("forecast returns 404 for cross-org parcel", async () => {
    mockAuth(crossOrg.userId, crossOrg.orgId);
    const res = await getForecast(new Request("http://localhost"), params);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.reason).toBe("unavailable");
  });
});
