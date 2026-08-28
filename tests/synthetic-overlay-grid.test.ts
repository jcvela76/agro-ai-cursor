import { describe, expect, it } from "vitest";
import { getSpectralLegend } from "@/domain/spectral/overlay-legends";
import { buildSyntheticOverlayGrid } from "@/domain/spectral/synthetic-overlay-grid";

const parcelGeometry = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-77.06, -11.96],
      [-77.04, -11.96],
      [-77.04, -11.94],
      [-77.06, -11.94],
      [-77.06, -11.96],
    ],
  ],
};

describe("Spectral-2: synthetic overlay grid", () => {
  it("returns points only inside the parcel polygon", () => {
    const legend = getSpectralLegend("ndre");
    const grid = buildSyntheticOverlayGrid({
      geometry: parcelGeometry,
      parcelId: "parcel-lima-norte-001",
      meanValue: 0.62,
      legend,
    });

    expect(grid.features.length).toBeGreaterThan(120);
    for (const feature of grid.features) {
      const [lng, lat] = feature.geometry.coordinates;
      expect(lng).toBeGreaterThanOrEqual(-77.06);
      expect(lng).toBeLessThanOrEqual(-77.04);
      expect(lat).toBeGreaterThanOrEqual(-11.96);
      expect(lat).toBeLessThanOrEqual(-11.94);
      expect(feature.properties!.value).toBeGreaterThanOrEqual(legend.min);
      expect(feature.properties!.value).toBeLessThanOrEqual(legend.max);
    }
  });

  it("is deterministic for the same parcel and index mean", () => {
    const legend = getSpectralLegend("evi");
    const first = buildSyntheticOverlayGrid({
      geometry: parcelGeometry,
      parcelId: "parcel-lima-norte-001",
      meanValue: 0.5,
      legend,
    });
    const second = buildSyntheticOverlayGrid({
      geometry: parcelGeometry,
      parcelId: "parcel-lima-norte-001",
      meanValue: 0.5,
      legend,
    });
    expect(second.features.map((f) => f.properties!.value)).toEqual(
      first.features.map((f) => f.properties!.value),
    );
  });
});
