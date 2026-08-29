import { describe, expect, it, vi } from "vitest";
import { GetParcelVegetationIndices } from "@/application/spectral/get-parcel-vegetation-indices";
import { GetParcelSpectralZones } from "@/application/spectral/get-parcel-spectral-zones";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineSpectralSceneRegistry } from "@/infrastructure/spectral/offline-spectral-scene-registry";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";

const plus = defaultSyntheticSnapshots.find((s) => s.userId === "user-plus-005")!;

describe("Perf-1 spectral cache read", () => {
  it("serves indices from scene history when source=cache", async () => {
    const parcels = new SyntheticParcelRegistry();
    const scenes = new OfflineSpectralSceneRegistry();
    const source = new OfflineSpectralSource();
    const live = new GetParcelVegetationIndices(parcels, source, scenes);
    const cached = new GetParcelVegetationIndices(parcels, source, scenes);

    await live.execute({ authority: plus, parcelId: "parcel-lima-norte-001", source: "live" });

    const spy = vi.spyOn(source, "getVegetationIndices");
    const result = await cached.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      source: "cache",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.evidence.freshnessPolicy).toContain("cache_read");
    expect(spy).not.toHaveBeenCalled();
  });

  it("auto falls back to live when cache empty", async () => {
    const result = await new GetParcelVegetationIndices(
      new SyntheticParcelRegistry(),
      new OfflineSpectralSource(),
      new OfflineSpectralSceneRegistry(),
    ).execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      source: "auto",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.evidence.freshnessPolicy).not.toContain("cache_read");
  });
});

describe("Perf-2 zones skip indices when scene hint provided", () => {
  it("does not call getVegetationIndices when acquiredAt + parcelMean are set", async () => {
    const source = new OfflineSpectralSource();
    const spy = vi.spyOn(source, "getVegetationIndices");
    const useCase = new GetParcelSpectralZones(new SyntheticParcelRegistry(), source);

    const result = await useCase.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      indexId: "ndre",
      acquiredAt: "2026-08-20T10:30:00-05:00",
      parcelMean: 0.28,
    });
    expect(result.ok).toBe(true);
    expect(spy).not.toHaveBeenCalled();
    if (!result.ok) return;
    expect(result.data.parcelMean).toBe(0.28);
    expect(result.data.evidence.freshnessPolicy).toContain("zones_acquired_at_hint");
  });
});
