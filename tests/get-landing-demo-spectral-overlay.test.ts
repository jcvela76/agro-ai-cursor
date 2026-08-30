import { describe, expect, it, vi } from "vitest";
import { GetLandingDemoSpectralOverlay } from "@/application/spectral/get-landing-demo-spectral-overlay";
import { LANDING_DEMO_PARCEL_ID, LANDING_DEMO_SCENES } from "@/content/landing/spectral-demo";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";
import type { SpectralSource } from "@/domain/spectral/types";

describe("LP-3b: landing demo spectral overlay", () => {
  it("rejects scenes outside the public allowlist", async () => {
    const useCase = new GetLandingDemoSpectralOverlay(new OfflineSpectralSource());
    const result = await useCase.execute({
      indexId: "ndre",
      acquisitionDate: "2019-01-01",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("unsupported_range");
    }
  });

  it("returns synthetic grid when Process is unavailable", async () => {
    const useCase = new GetLandingDemoSpectralOverlay(new OfflineSpectralSource());
    const scene = LANDING_DEMO_SCENES[LANDING_DEMO_SCENES.length - 1]!;
    const result = await useCase.execute({
      indexId: "ndre",
      acquisitionDate: scene.acquisitionDate,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.rendering).toBe("synthetic_grid");
      expect(result.data.grid.features.length).toBeGreaterThan(0);
      expect(result.data.value).toBeCloseTo(scene.ndreMean, 6);
    }
  });

  it("returns sentinel raster when Process PNG is available", async () => {
    const getIndexOverlay = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        imageDataUrl: "data:image/png;base64,AAAA",
        coordinates: [
          [-75.79, -14.01],
          [-75.77, -14.01],
          [-75.77, -14.03],
          [-75.79, -14.03],
        ],
        width: 64,
        height: 64,
      },
    });
    const source = { getIndexOverlay } as unknown as SpectralSource;
    const useCase = new GetLandingDemoSpectralOverlay(source);
    const scene = LANDING_DEMO_SCENES[0]!;
    const result = await useCase.execute({
      indexId: "evi",
      acquisitionDate: scene.acquisitionDate,
    });
    expect(getIndexOverlay).toHaveBeenCalledOnce();
    expect(getIndexOverlay.mock.calls[0][0]).toMatchObject({
      parcelId: LANDING_DEMO_PARCEL_ID,
      indexId: "evi",
      acquiredAt: `${scene.acquisitionDate}T12:00:00Z`,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.rendering).toBe("sentinel_raster");
      expect(result.data.raster?.imageDataUrl).toContain("image/png");
    }
  });
});
