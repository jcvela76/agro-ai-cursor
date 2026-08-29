import { describe, expect, it, vi } from "vitest";
import { GetParcelSpectralOverlay } from "@/application/spectral/get-parcel-spectral-overlay";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";
import {
  buildIndexRasterEvalscript,
  geometryBbox,
  bboxImageCoordinates,
} from "@/infrastructure/spectral/sentinel-hub-index-evalscript";
import {
  SentinelHubSpectralSource,
} from "@/infrastructure/spectral/sentinel-hub-spectral-source";
import { TtlCache } from "@/infrastructure/spectral/ttl-cache";
import type { ParcelVegetationIndices, SpectralResult } from "@/domain/spectral/types";

const plus = defaultSyntheticSnapshots.find((s) => s.userId === "user-plus-005")!;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Spectral-5: CDSE raster overlay", () => {
  it("builds evalscript with index formula and legend stops", () => {
    const script = buildIndexRasterEvalscript("ndwi");
    expect(script).toContain("B03");
    expect(script).toContain("B08");
    expect(script).toContain("colorize");
    expect(script).toContain("STOPS");
    expect(script).toContain("USE_STRETCH=false");
  });

  it("stretches colormap around parcel mean for arid low-variance fields", () => {
    const script = buildIndexRasterEvalscript("ndre", { colorCenter: -0.0003 });
    expect(script).toContain("USE_STRETCH=true");
    expect(script).toContain("CENTER=-0.000300");
    expect(script).toContain("HALF=0.0550");
  });

  it("maps polygon bbox to MapLibre image corners", () => {
    const bbox = geometryBbox({
      type: "Polygon",
      coordinates: [
        [
          [-77.05, -11.95],
          [-77.04, -11.95],
          [-77.04, -11.94],
          [-77.05, -11.94],
          [-77.05, -11.95],
        ],
      ],
    });
    expect(bboxImageCoordinates(bbox)).toEqual([
      [-77.05, -11.94],
      [-77.04, -11.94],
      [-77.04, -11.95],
      [-77.05, -11.95],
    ]);
  });

  it("returns sentinel_raster when Process API PNG succeeds", async () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(40).fill(1),
    ]);
    const fetchFn = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes("openid-connect/token")) {
        return jsonResponse({ access_token: "tok", expires_in: 1800 });
      }
      if (String(url).includes("/statistics")) {
        return jsonResponse({
          status: "OK",
          data: [
            {
              interval: { from: "2026-08-08T00:00:00Z", to: "2026-08-09T00:00:00Z" },
              outputs: {
                bands: {
                  bands: {
                    blue: { stats: { mean: 0.2, sampleCount: 10, noDataCount: 0 } },
                    green: { stats: { mean: 0.2, sampleCount: 10, noDataCount: 0 } },
                    red: { stats: { mean: 0.2, sampleCount: 10, noDataCount: 0 } },
                    redEdge: { stats: { mean: 0.2, sampleCount: 10, noDataCount: 0 } },
                    nir: { stats: { mean: 0.25, sampleCount: 10, noDataCount: 0 } },
                    swir: { stats: { mean: 0.2, sampleCount: 10, noDataCount: 0 } },
                    swir2: { stats: { mean: 0.2, sampleCount: 10, noDataCount: 0 } },
                  },
                },
              },
            },
          ],
        });
      }
      return new Response(png, {
        status: 200,
        headers: { "Content-Type": "image/png" },
      });
    });

    const source = new SentinelHubSpectralSource({
      clientId: "id",
      clientSecret: "secret",
      fetchFn,
      cacheTtlMs: 0,
      cache: new TtlCache<SpectralResult<ParcelVegetationIndices>>(),
      rasterCache: new TtlCache(),
      now: () => new Date("2026-08-28T12:00:00Z"),
    });

    const useCase = new GetParcelSpectralOverlay(new SyntheticParcelRegistry(), source);
    const result = await useCase.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      indexId: "ndwi",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.rendering).toBe("sentinel_raster");
    expect(result.data.raster?.imageDataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(result.data.grid.features).toHaveLength(0);
    const processCall = fetchFn.mock.calls.find((c) => String(c[0]).includes("/process"));
    expect(processCall).toBeTruthy();
    const processBody = JSON.parse(String((processCall?.[1] as RequestInit).body));
    expect(processBody.input.data[0].dataFilter.timeRange).toEqual({
      from: "2026-08-08T00:00:00Z",
      to: "2026-08-14T23:59:59Z",
    });
  });

  it("falls back to synthetic_grid when source has no Process API", async () => {
    const useCase = new GetParcelSpectralOverlay(
      new SyntheticParcelRegistry(),
      new OfflineSpectralSource(),
    );
    const result = await useCase.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      indexId: "ndre",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.rendering).toBe("synthetic_grid");
    expect(result.data.raster).toBeUndefined();
  });
});
