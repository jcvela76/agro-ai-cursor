import { describe, expect, it } from "vitest";
import { compareSpectralScenes } from "@/domain/spectral/compare-scenes";
import type { SpectralSceneRecord } from "@/domain/spectral/scene-history";
import type { VegetationIndexId } from "@/domain/spectral/types";

function scene(
  id: string,
  acquisitionDate: string,
  values: Partial<Record<VegetationIndexId, number | null>>,
): SpectralSceneRecord {
  return {
    id,
    orgId: "org",
    parcelId: "parcel",
    acquisitionDate,
    acquiredAt: `${acquisitionDate}T15:00:00.000Z`,
    sourceId: "cdse",
    sourceLabel: "CDSE",
    indices: (Object.keys(values) as VegetationIndexId[]).map((indexId) => ({
      id: indexId,
      value: values[indexId] ?? null,
    })),
    evidence: {
      sourceId: "cdse",
      sourceLabel: "CDSE",
      acquiredAt: `${acquisitionDate}T15:00:00.000Z`,
      timezone: "America/Lima",
      spatialScope: {
        kind: "point",
        latitude: -14,
        longitude: -75,
        label: "parcel",
      },
      freshnessStatus: "fresh",
      freshnessPolicy: "test",
    },
    createdAt: `${acquisitionDate}T16:00:00.000Z`,
    updatedAt: `${acquisitionDate}T16:00:00.000Z`,
  };
}

describe("compareSpectralScenes", () => {
  it("orders by acquisition date and computes later − earlier", () => {
    const newer = scene("b", "2026-08-20", { ndre: 0.42, evi: 0.3 });
    const older = scene("a", "2026-08-10", { ndre: 0.38, evi: 0.28 });
    const result = compareSpectralScenes(newer, older, ["ndre", "evi"]);
    expect(result.earlier.id).toBe("a");
    expect(result.later.id).toBe("b");
    expect(result.byIndex[0]).toMatchObject({
      indexId: "ndre",
      earlierValue: 0.38,
      laterValue: 0.42,
      delta: 0.04,
    });
  });

  it("returns null delta when a value is missing", () => {
    const a = scene("a", "2026-08-10", { ndre: 0.38 });
    const b = scene("b", "2026-08-20", { ndre: null });
    const result = compareSpectralScenes(a, b, ["ndre"]);
    expect(result.byIndex[0]?.delta).toBeNull();
  });
});
