import { afterEach, describe, expect, it, vi } from "vitest";
import { CdseTokenProvider } from "@/infrastructure/spectral/cdse-auth";
import {
  SENTINEL_HUB_SOURCE_ID,
  SentinelHubSpectralSource,
} from "@/infrastructure/spectral/sentinel-hub-spectral-source";

const limaGeometry = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-77.050995, -11.950995],
      [-77.049005, -11.950995],
      [-77.049005, -11.949005],
      [-77.050995, -11.949005],
      [-77.050995, -11.950995],
    ],
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("SentinelHubSpectralSource (CDSE)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps Statistical API means to vegetation indices with CDSE evidence", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ access_token: "tok-test", expires_in: 1800 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: "OK",
          data: [
            {
              interval: { from: "2026-08-20T00:00:00Z", to: "2026-08-25T00:00:00Z" },
              outputs: {
                bands: {
                  bands: {
                    blue: { stats: { mean: 0.05, sampleCount: 100, noDataCount: 0 } },
                    green: { stats: { mean: 0.06, sampleCount: 100, noDataCount: 0 } },
                    red: { stats: { mean: 0.07, sampleCount: 100, noDataCount: 0 } },
                    redEdge: { stats: { mean: 0.12, sampleCount: 100, noDataCount: 0 } },
                    nir: { stats: { mean: 0.28, sampleCount: 100, noDataCount: 0 } },
                    swir: { stats: { mean: 0.15, sampleCount: 100, noDataCount: 0 } },
                    swir2: { stats: { mean: 0.1, sampleCount: 100, noDataCount: 0 } },
                  },
                },
              },
            },
          ],
        }),
      );

    const source = new SentinelHubSpectralSource({
      clientId: "sh-test",
      clientSecret: "secret",
      fetchFn,
      cacheTtlMs: 0,
      now: () => new Date("2026-08-28T12:00:00Z"),
      lookbackDays: 30,
      freshnessMaxDays: 14,
    });

    const result = await source.getVegetationIndices("parcel-lima-norte-001", {
      latitude: -11.95,
      longitude: -77.05,
      geometry: limaGeometry,
      timezone: "America/Lima",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.evidence.sourceId).toBe(SENTINEL_HUB_SOURCE_ID);
    expect(result.data.evidence.freshnessStatus).toBe("fresh");
    expect(result.data.acquisitionDate).toBe("2026-08-20");
    expect(result.data.indices).toHaveLength(8);
    expect(result.data.indices[0]?.id).toBe("ndre");
    expect(result.data.indices[0]?.value).not.toBeNull();

    expect(fetchFn).toHaveBeenCalledTimes(2);
    const statsCall = fetchFn.mock.calls[1];
    expect(String(statsCall[0])).toContain("/api/v1/statistics");
    const body = JSON.parse(String(statsCall[1]?.body));
    expect(body.input.data[0].type).toBe("sentinel-2-l2a");
    expect(body.input.bounds.geometry.type).toBe("Polygon");
  });

  it("marks evidence stale when acquisition exceeds freshness window", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "tok", expires_in: 1800 }))
      .mockResolvedValueOnce(
        jsonResponse({
          status: "OK",
          data: [
            {
              interval: { from: "2026-08-01T00:00:00Z", to: "2026-08-06T00:00:00Z" },
              outputs: {
                bands: {
                  bands: {
                    blue: { stats: { mean: 0.1, sampleCount: 10, noDataCount: 0 } },
                    green: { stats: { mean: 0.1, sampleCount: 10, noDataCount: 0 } },
                    red: { stats: { mean: 0.1, sampleCount: 10, noDataCount: 0 } },
                    redEdge: { stats: { mean: 0.1, sampleCount: 10, noDataCount: 0 } },
                    nir: { stats: { mean: 0.2, sampleCount: 10, noDataCount: 0 } },
                    swir: { stats: { mean: 0.1, sampleCount: 10, noDataCount: 0 } },
                    swir2: { stats: { mean: 0.1, sampleCount: 10, noDataCount: 0 } },
                  },
                },
              },
            },
          ],
        }),
      );

    const source = new SentinelHubSpectralSource({
      clientId: "sh-test",
      clientSecret: "secret",
      fetchFn,
      cacheTtlMs: 0,
      now: () => new Date("2026-08-28T12:00:00Z"),
      freshnessMaxDays: 14,
    });

    const result = await source.getVegetationIndices("p1", {
      latitude: -11.95,
      longitude: -77.05,
      geometry: limaGeometry,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.evidence.freshnessStatus).toBe("stale");
  });

  it("returns unavailable when no valid interval", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "tok", expires_in: 1800 }))
      .mockResolvedValueOnce(jsonResponse({ status: "OK", data: [] }));

    const source = new SentinelHubSpectralSource({
      clientId: "sh-test",
      clientSecret: "secret",
      fetchFn,
      cacheTtlMs: 0,
    });

    const result = await source.getVegetationIndices("p1", {
      latitude: -11.95,
      longitude: -77.05,
      geometry: limaGeometry,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("unavailable");
  });

  it("caches successful CDSE results and skips a second network round-trip", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "tok", expires_in: 1800 }))
      .mockResolvedValueOnce(
        jsonResponse({
          status: "OK",
          data: [
            {
              interval: { from: "2026-08-20T00:00:00Z", to: "2026-08-25T00:00:00Z" },
              outputs: {
                bands: {
                  bands: {
                    blue: { stats: { mean: 0.05, sampleCount: 100, noDataCount: 0 } },
                    green: { stats: { mean: 0.06, sampleCount: 100, noDataCount: 0 } },
                    red: { stats: { mean: 0.07, sampleCount: 100, noDataCount: 0 } },
                    redEdge: { stats: { mean: 0.12, sampleCount: 100, noDataCount: 0 } },
                    nir: { stats: { mean: 0.28, sampleCount: 100, noDataCount: 0 } },
                    swir: { stats: { mean: 0.15, sampleCount: 100, noDataCount: 0 } },
                    swir2: { stats: { mean: 0.1, sampleCount: 100, noDataCount: 0 } },
                  },
                },
              },
            },
          ],
        }),
      );

    const { TtlCache } = await import("@/infrastructure/spectral/ttl-cache");
    const cache = new TtlCache<
      import("@/domain/spectral/types").SpectralResult<
        import("@/domain/spectral/types").ParcelVegetationIndices
      >
    >();
    const source = new SentinelHubSpectralSource({
      clientId: "sh-test",
      clientSecret: "secret",
      fetchFn,
      cache,
      cacheTtlMs: 60_000,
      now: () => new Date("2026-08-28T12:00:00Z"),
    });

    const location = {
      latitude: -11.95,
      longitude: -77.05,
      geometry: limaGeometry,
    };
    const first = await source.getVegetationIndices("parcel-cache-1", location);
    const second = await source.getVegetationIndices("parcel-cache-1", location);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(2); // token + stats once
  });

  it("caches CDSE access tokens", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(jsonResponse({ access_token: "tok-cached", expires_in: 1800 }));
    const provider = new CdseTokenProvider("id", "secret", fetchFn);
    const a = await provider.getAccessToken();
    const b = await provider.getAccessToken();
    expect(a).toBe("tok-cached");
    expect(b).toBe("tok-cached");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
