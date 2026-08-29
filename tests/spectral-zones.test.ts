import { describe, expect, it, vi } from "vitest";
import { classifyRelativeTiers } from "@/domain/spectral/classify-zones";
import { compassLabel, partitionParcelZones } from "@/domain/spectral/partition-zones";
import { GetParcelSpectralZones } from "@/application/spectral/get-parcel-spectral-zones";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";
import { SentinelHubSpectralSource } from "@/infrastructure/spectral/sentinel-hub-spectral-source";
import { TtlCache } from "@/infrastructure/spectral/ttl-cache";

const decodeFloatTiffMock = vi.hoisted(() =>
  vi.fn(async () => ({
    values: Float32Array.from({ length: 96 * 96 }, (_, i) => 0.15 + (i % 7) * 0.03),
    width: 96,
    height: 96,
  })),
);

vi.mock("@/infrastructure/spectral/aggregate-zone-raster", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/infrastructure/spectral/aggregate-zone-raster")>();
  return {
    ...actual,
    decodeFloatTiff: decodeFloatTiffMock,
  };
});

const square = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-77.05, -11.95],
      [-77.04, -11.95],
      [-77.04, -11.94],
      [-77.05, -11.94],
      [-77.05, -11.95],
    ],
  ],
};

describe("Spectral-6 zone partition", () => {
  it("builds multiple fishnet cells inside a square parcel", () => {
    const cells = partitionParcelZones(square, 3);
    expect(cells.length).toBeGreaterThanOrEqual(2);
    expect(cells.length).toBeLessThanOrEqual(9);
  });

  it("labels compass relative to origin", () => {
    expect(
      compassLabel(
        { longitude: -77.04, latitude: -11.94 },
        { longitude: -77.045, latitude: -11.945 },
      ),
    ).toBe("NE");
    expect(
      compassLabel(
        { longitude: -77.045, latitude: -11.945 },
        { longitude: -77.045, latitude: -11.945 },
      ),
    ).toBe("centro");
  });

  it("classifies relative tiers", () => {
    expect(classifyRelativeTiers([0.1, 0.5, 0.9])).toEqual(["low", "mid", "high"]);
    expect(classifyRelativeTiers([0.2, 0.8])).toEqual(["low", "high"]);
  });
});

describe("GetParcelSpectralZones", () => {
  const plus = defaultSyntheticSnapshots.find((s) => s.userId === "user-plus-005")!;
  const weatherOnly = defaultSyntheticSnapshots.find((s) => s.userId === "user-agronomist-001")!;

  it("requires Plus", async () => {
    const useCase = new GetParcelSpectralZones(
      new SyntheticParcelRegistry(),
      new OfflineSpectralSource(),
    );
    const result = await useCase.execute({
      authority: weatherOnly,
      parcelId: "parcel-lima-norte-001",
      indexId: "ndre",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Plus");
    }
  });

  it("returns synthetic zones offline", async () => {
    const useCase = new GetParcelSpectralZones(
      new SyntheticParcelRegistry(),
      new OfflineSpectralSource(),
    );
    const result = await useCase.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      indexId: "ndwi",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.kind).toBe("spectral_zones");
    expect(result.data.indexId).toBe("ndwi");
    expect(result.data.zones.length).toBeGreaterThanOrEqual(1);
    expect(result.data.methodId).toContain("zones_synthetic");
  });

  it("returns live CDSE zone means with one Process call (Perf-4)", async () => {
    decodeFloatTiffMock.mockClear();
    decodeFloatTiffMock.mockResolvedValue({
      values: Float32Array.from({ length: 96 * 96 }, (_, i) => 0.15 + (i % 7) * 0.03),
      width: 96,
      height: 96,
    });

    function jsonResponse(body: unknown, status = 200): Response {
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }

    let processCalls = 0;
    let statsCalls = 0;
    const fetchFn = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes("openid-connect/token")) {
        return jsonResponse({ access_token: "tok", expires_in: 1800 });
      }
      if (String(url).includes("/process")) {
        processCalls += 1;
        return new Response(new Uint8Array(64).buffer, {
          status: 200,
          headers: { "Content-Type": "image/tiff" },
        });
      }
      if (String(url).includes("/statistics")) {
        statsCalls += 1;
        return new Response("nope", { status: 500 });
      }
      return new Response("nope", { status: 404 });
    });

    const source = new SentinelHubSpectralSource({
      clientId: "id",
      clientSecret: "secret",
      fetchFn,
      cacheTtlMs: 0,
      cache: new TtlCache(),
      rasterCache: new TtlCache(),
      zonesCache: new TtlCache(),
      now: () => new Date("2026-08-28T12:00:00Z"),
    });

    const useCase = new GetParcelSpectralZones(new SyntheticParcelRegistry(), source);
    const result = await useCase.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      indexId: "ndre",
      acquiredAt: "2026-08-20T10:30:00-05:00",
      parcelMean: 0.28,
      sourceId: "sentinel-hub-cdse",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.methodId).toContain("zones/v2");
    expect(result.data.evidence.freshnessPolicy).toContain("zones_fishnet_process_1");
    expect(result.data.zones.length).toBeGreaterThanOrEqual(2);
    expect(processCalls).toBe(1);
    expect(statsCalls).toBe(0);
    expect(decodeFloatTiffMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to Statistical cells when Process fails", async () => {
    function jsonResponse(body: unknown, status = 200): Response {
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const statsBody = {
      status: "OK",
      data: [
        {
          interval: { from: "2026-08-08T00:00:00Z", to: "2026-08-09T00:00:00Z" },
          outputs: {
            bands: {
              bands: {
                blue: { stats: { mean: 0.1, sampleCount: 10, noDataCount: 0 } },
                green: { stats: { mean: 0.12, sampleCount: 10, noDataCount: 0 } },
                red: { stats: { mean: 0.1, sampleCount: 10, noDataCount: 0 } },
                redEdge: { stats: { mean: 0.15, sampleCount: 10, noDataCount: 0 } },
                nir: { stats: { mean: 0.35, sampleCount: 10, noDataCount: 0 } },
                swir: { stats: { mean: 0.2, sampleCount: 10, noDataCount: 0 } },
                swir2: { stats: { mean: 0.18, sampleCount: 10, noDataCount: 0 } },
              },
            },
          },
        },
      ],
    };

    let processCalls = 0;
    let statsCalls = 0;
    const fetchFn = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes("openid-connect/token")) {
        return jsonResponse({ access_token: "tok", expires_in: 1800 });
      }
      if (String(url).includes("/process")) {
        processCalls += 1;
        return new Response("fail", { status: 500 });
      }
      if (String(url).includes("/statistics")) {
        statsCalls += 1;
        const nir = 0.3 + (statsCalls % 3) * 0.05;
        const body = structuredClone(statsBody);
        body.data[0]!.outputs!.bands!.bands!.nir!.stats!.mean = nir;
        return jsonResponse(body);
      }
      return new Response("nope", { status: 404 });
    });

    const source = new SentinelHubSpectralSource({
      clientId: "id",
      clientSecret: "secret",
      fetchFn,
      cacheTtlMs: 0,
      cache: new TtlCache(),
      rasterCache: new TtlCache(),
      zonesCache: new TtlCache(),
      now: () => new Date("2026-08-28T12:00:00Z"),
    });

    const useCase = new GetParcelSpectralZones(new SyntheticParcelRegistry(), source);
    const result = await useCase.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      indexId: "ndre",
      acquiredAt: "2026-08-20T10:30:00-05:00",
      parcelMean: 0.28,
      sourceId: "sentinel-hub-cdse",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.methodId).toContain("zones/v1");
    expect(result.data.evidence.freshnessPolicy).toContain("zones_fishnet_3");
    expect(processCalls).toBe(1);
    expect(statsCalls).toBeGreaterThan(1);
  });
});
