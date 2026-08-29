import { describe, expect, it, vi } from "vitest";
import { GetParcelSpectralOverlay } from "@/application/spectral/get-parcel-spectral-overlay";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";
import type { SpectralSource } from "@/domain/spectral/types";

describe("Spectral-2: parcel spectral overlay (Plus)", () => {
  const registry = new SyntheticParcelRegistry();
  const source = new OfflineSpectralSource();
  const useCase = new GetParcelSpectralOverlay(registry, source);

  it("denies without weather_plus entitlement", async () => {
    const result = await useCase.execute({
      authority: defaultSyntheticSnapshots[0],
      parcelId: "parcel-lima-norte-001",
      indexId: "ndre",
    });
    expect(result.ok).toBe(false);
  });

  it("returns overlay grid for parcel polygon", async () => {
    const result = await useCase.execute({
      authority: defaultSyntheticSnapshots[4],
      parcelId: "parcel-lima-norte-001",
      indexId: "ndre",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.kind).toBe("spectral_overlay");
      expect(result.data.indexId).toBe("ndre");
      expect(result.data.value).toBeCloseTo(0.2857, 3);
      expect(result.data.legend.minLabel).toBe("Estrés");
      expect(result.data.grid.features.length).toBeGreaterThan(0);
      expect(result.data.rendering).toBe("synthetic_grid");
    }
  });

  it("resolves prod dual-seed parcel id for overlay grid", async () => {
    const result = await useCase.execute({
      authority: {
        userId: "user-plus-prod",
        orgId: "org_3IW1Ls81Xul5wDXca1hCD0iAMQ5",
        isActiveMember: true,
        entitlements: ["weather", "weather_plus"],
        authorizedParcelIds: [],
      },
      parcelId: "parcel-lima-norte-prod-001",
      indexId: "ndre",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.grid.features.length).toBeGreaterThan(0);
    }
  });

  it("skips indices provider when acquiredAt + parcelMean hints are provided", async () => {
    const getVegetationIndices = vi.fn();
    const getIndexOverlay = vi.fn().mockResolvedValue({
      ok: false,
      reason: "unavailable",
      message: "Process down",
    });
    const hinted = {
      getVegetationIndices,
      getIndexOverlay,
    } as unknown as SpectralSource;
    const hintedUseCase = new GetParcelSpectralOverlay(registry, hinted);
    const result = await hintedUseCase.execute({
      authority: defaultSyntheticSnapshots[4],
      parcelId: "parcel-lima-norte-001",
      indexId: "evi",
      acquiredAt: "2026-08-20T12:00:00Z",
      parcelMean: 0.42,
    });
    expect(getVegetationIndices).not.toHaveBeenCalled();
    expect(getIndexOverlay).toHaveBeenCalledOnce();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.rendering).toBe("synthetic_grid");
      expect(result.data.fallbackReason).toMatch(/Process/);
      expect(result.data.value).toBe(0.42);
    }
  });
});
