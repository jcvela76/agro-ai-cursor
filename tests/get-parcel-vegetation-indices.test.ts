import { describe, expect, it } from "vitest";
import { GetParcelVegetationIndices } from "@/application/spectral/get-parcel-vegetation-indices";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";

describe("Spectral-1: parcel vegetation indices (Plus)", () => {
  const registry = new SyntheticParcelRegistry();
  const source = new OfflineSpectralSource();
  const useCase = new GetParcelVegetationIndices(registry, source);

  it("denies without weather_plus entitlement", async () => {
    const result = await useCase.execute({
      authority: defaultSyntheticSnapshots[0],
      parcelId: "parcel-lima-norte-001",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Plus");
    }
  });

  it("returns eight indices with evidence for Plus user", async () => {
    const result = await useCase.execute({
      authority: defaultSyntheticSnapshots[4],
      parcelId: "parcel-lima-norte-001",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.kind).toBe("vegetation_indices");
      expect(result.data.indices).toHaveLength(8);
      expect(result.data.indices[0]?.id).toBe("ndre");
      expect(result.data.indices[0]?.value).toBeCloseTo(0.2857, 3);
      expect(result.data.evidence.sourceId).toBe("offline-sentinel-2-synthetic");
      expect(result.data.evidence.satelliteMission).toBe("Sentinel-2");
    }
  });
});
