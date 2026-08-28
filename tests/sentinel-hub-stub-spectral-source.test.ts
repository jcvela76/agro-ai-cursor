import { describe, expect, it } from "vitest";
import { GetParcelVegetationIndices } from "@/application/spectral/get-parcel-vegetation-indices";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { createSpectralSource } from "@/infrastructure/container";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import {
  SENTINEL_HUB_STUB_SOURCE_ID,
  SentinelHubStubSpectralSource,
} from "@/infrastructure/spectral/sentinel-hub-stub-spectral-source";

describe("SentinelHubStubSpectralSource", () => {
  it("returns synthetic indices with Sentinel Hub stub provenance", async () => {
    const source = new SentinelHubStubSpectralSource();
    const result = await source.getVegetationIndices("parcel-lima-norte-001");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.evidence.sourceId).toBe(SENTINEL_HUB_STUB_SOURCE_ID);
      expect(result.data.evidence.sourceLabel).toMatch(/stub offline/i);
      expect(result.data.evidence.sourceLabel).toMatch(/no live API/i);
      expect(result.data.evidence.satelliteMission).toBe("Sentinel-2");
      expect(result.data.evidence.processingLevel).toBe("L2A");
    }
  });

  it("factory accepts sentinel_hub_stub", () => {
    expect(createSpectralSource("sentinel_hub_stub")).toBeInstanceOf(
      SentinelHubStubSpectralSource,
    );
  });
});

describe("Sentinel Hub stub Plus gate", () => {
  const registry = new SyntheticParcelRegistry();
  const source = new SentinelHubStubSpectralSource();
  const plus = defaultSyntheticSnapshots.find((s) => s.userId === "user-plus-005")!;

  it("denies without weather_plus", async () => {
    const useCase = new GetParcelVegetationIndices(registry, source);
    const result = await useCase.execute({
      authority: defaultSyntheticSnapshots[0],
      parcelId: "parcel-lima-norte-001",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Plus");
    }
  });

  it("allows indices when weather_plus present", async () => {
    const useCase = new GetParcelVegetationIndices(registry, source);
    const result = await useCase.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.evidence.sourceId).toBe(SENTINEL_HUB_STUB_SOURCE_ID);
      expect(result.data.indices).toHaveLength(8);
    }
  });
});
