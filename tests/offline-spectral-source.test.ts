import { describe, expect, it } from "vitest";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";

describe("OfflineSpectralSource", () => {
  const source = new OfflineSpectralSource();

  it("matches fixtures by parcel coordinates when id is unknown", async () => {
    const result = await source.getVegetationIndices("parcel-unknown-neon-uuid", {
      latitude: -11.95,
      longitude: -77.05,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.indices[0]?.value).toBeCloseTo(0.2857, 3);
    }
  });
});
