import { describe, expect, it } from "vitest";
import {
  computeEvi,
  computeGndvi,
  computeMsavi,
  computeNdmi,
  computeNdre,
  computeNdwi,
  computeNbr,
  computeSavi,
  computeVegetationIndices,
} from "@/domain/spectral/vegetation-indices";
import type { SpectralReflectanceBands } from "@/domain/spectral/types";

const bands: SpectralReflectanceBands = {
  blue: 0.05,
  green: 0.12,
  red: 0.08,
  redEdge: 0.25,
  nir: 0.45,
  swir: 0.2,
  swir2: 0.1,
};

describe("vegetation indices", () => {
  it("computes NDRE from red edge and NIR", () => {
    expect(computeNdre(bands)).toBeCloseTo(0.2857, 3);
  });

  it("computes EVI with atmospheric correction terms", () => {
    expect(computeEvi(bands)).toBeCloseTo(0.5949, 3);
  });

  it("computes SAVI with soil brightness L=0.5", () => {
    expect(computeSavi(bands)).toBeCloseTo(0.5388, 3);
  });

  it("computes MSAVI2", () => {
    expect(computeMsavi(bands)).toBeCloseTo(0.5469, 3);
  });

  it("computes GNDVI from green and NIR", () => {
    expect(computeGndvi(bands)).toBeCloseTo(0.5789, 3);
  });

  it("computes NDWI (McFeeters green-NIR)", () => {
    expect(computeNdwi(bands)).toBeCloseTo(-0.5789, 3);
  });

  it("computes NDMI from NIR and SWIR", () => {
    expect(computeNdmi(bands)).toBeCloseTo(0.3846, 3);
  });

  it("computes NBR from NIR and SWIR2", () => {
    expect(computeNbr(bands)).toBeCloseTo(0.6364, 3);
  });

  it("returns all eight catalog indices in stable order", () => {
    const indices = computeVegetationIndices(bands);
    expect(indices).toHaveLength(8);
    expect(indices.map((item) => item.id)).toEqual([
      "ndre",
      "evi",
      "savi",
      "msavi",
      "gndvi",
      "ndwi",
      "ndmi",
      "nbr",
    ]);
    expect(indices.every((item) => item.methodId.endsWith("/v1"))).toBe(true);
  });
});
