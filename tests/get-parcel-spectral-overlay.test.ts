import { describe, expect, it } from "vitest";
import { GetParcelSpectralOverlay } from "@/application/spectral/get-parcel-spectral-overlay";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";

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
});
