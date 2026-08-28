import { describe, expect, it } from "vitest";
import { demoParcelSquare } from "@/domain/parcel/geometry";
import { getSpectralLegend } from "@/domain/spectral/overlay-legends";
import { buildSyntheticOverlayGrid } from "@/domain/spectral/synthetic-overlay-grid";

const parcelGeometry = demoParcelSquare(-77.05, -11.95);
const ring = parcelGeometry.coordinates[0]!;
const lngMin = Math.min(...ring.map((p) => p[0]));
const lngMax = Math.max(...ring.map((p) => p[0]));
const latMin = Math.min(...ring.map((p) => p[1]));
const latMax = Math.max(...ring.map((p) => p[1]));

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
      expect(lng).toBeGreaterThanOrEqual(lngMin);
      expect(lng).toBeLessThanOrEqual(lngMax);
      expect(lat).toBeGreaterThanOrEqual(latMin);
      expect(lat).toBeLessThanOrEqual(latMax);
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
