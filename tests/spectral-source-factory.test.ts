import { describe, expect, it } from "vitest";
import { createSpectralSource } from "@/infrastructure/container";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";
import { SentinelHubStubSpectralSource } from "@/infrastructure/spectral/sentinel-hub-stub-spectral-source";

describe("QA-3: spectral source factory", () => {
  it("defaults to offline source", () => {
    const previous = process.env.SPECTRAL_SOURCE;
    delete process.env.SPECTRAL_SOURCE;
    try {
      expect(createSpectralSource()).toBeInstanceOf(OfflineSpectralSource);
    } finally {
      if (previous === undefined) {
        delete process.env.SPECTRAL_SOURCE;
      } else {
        process.env.SPECTRAL_SOURCE = previous;
      }
    }
  });

  it("selects sentinel hub stub without live API", () => {
    expect(createSpectralSource("sentinel_hub_stub")).toBeInstanceOf(
      SentinelHubStubSpectralSource,
    );
    expect(() => createSpectralSource("sentinel_hub")).toThrow(/disabled until contract/);
  });
});
