import { describe, expect, it, vi } from "vitest";
import { partitionParcelZones } from "@/domain/spectral/partition-zones";
import { aggregateZoneRaster } from "@/infrastructure/spectral/aggregate-zone-raster";

const square = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-77.05, -11.95],
      [-77.04, -11.95],
      [-77.04, -11.94],
      [-77.05, -11.94],
      [-77.05, -11.95],
    ],
  ],
};

describe("aggregateZoneRaster", () => {
  it("averages pixel values into fishnet cells", () => {
    const cells = partitionParcelZones(square, 3);
    expect(cells.length).toBeGreaterThanOrEqual(2);

    const width = 3;
    const height = 3;
    // north-up: row0 = north. Distinct values per pixel.
    const values = Float32Array.from([
      0.1, 0.2, 0.3, // top row
      0.4, 0.5, 0.6,
      0.7, 0.8, 0.9, // bottom
    ]);
    const bbox = {
      minLng: -77.05,
      minLat: -11.95,
      maxLng: -77.04,
      maxLat: -11.94,
    };

    const means = aggregateZoneRaster({ values, width, height, bbox, cells });
    let nonNull = 0;
    for (const cell of cells) {
      const mean = means.get(cell.id);
      if (mean !== null && mean !== undefined) {
        nonNull += 1;
        expect(mean).toBeGreaterThan(0);
        expect(mean).toBeLessThan(1);
      }
    }
    expect(nonNull).toBeGreaterThanOrEqual(2);
  });

  it("skips NaN samples", () => {
    const cells = partitionParcelZones(square, 3);
    const values = Float32Array.from([NaN, NaN, NaN, NaN, 0.55, NaN, NaN, NaN, NaN]);
    const means = aggregateZoneRaster({
      values,
      width: 3,
      height: 3,
      bbox: { minLng: -77.05, minLat: -11.95, maxLng: -77.04, maxLat: -11.94 },
      cells,
    });
    const vals = [...means.values()].filter((v) => v !== null);
    expect(vals.length).toBeGreaterThanOrEqual(1);
    expect(vals[0]).toBeCloseTo(0.55, 5);
  });
});
