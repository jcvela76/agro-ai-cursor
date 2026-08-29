import { describe, expect, it } from "vitest";
import {
  indexOfScene,
  sceneAtIndex,
  sortScenesAsc,
} from "@/domain/spectral/timeline-scenes";
import type { SpectralSceneRecord } from "@/domain/spectral/scene-history";

function scene(
  id: string,
  acquisitionDate: string,
  acquiredAt: string,
): SpectralSceneRecord {
  return {
    id,
    orgId: "org_test",
    parcelId: "parcel_test",
    acquisitionDate,
    acquiredAt,
    sourceId: "sentinel-hub-cdse",
    sourceLabel: "CDSE",
    indices: [],
    evidence: {
      sourceId: "sentinel-hub-cdse",
      sourceLabel: "CDSE",
      acquiredAt,
      timezone: "America/Lima",
      spatialScope: {
        kind: "point",
        latitude: -12,
        longitude: -77,
        label: "parcel_test",
      },
      freshnessStatus: "fresh",
      freshnessPolicy: "test",
    },
    createdAt: acquiredAt,
    updatedAt: acquiredAt,
  };
}

describe("sortScenesAsc", () => {
  it("orders by acquisitionDate then acquiredAt", () => {
    const scenes = [
      scene("c", "2026-08-28", "2026-08-28T12:00:00Z"),
      scene("a", "2026-08-10", "2026-08-10T18:00:00Z"),
      scene("b", "2026-08-10", "2026-08-10T07:00:00Z"),
    ];
    expect(sortScenesAsc(scenes).map((s) => s.id)).toEqual(["b", "a", "c"]);
  });
});

describe("sceneAtIndex / indexOfScene", () => {
  const scenes = [
    scene("old", "2026-08-10", "2026-08-10T12:00:00Z"),
    scene("mid", "2026-08-20", "2026-08-20T12:00:00Z"),
    scene("new", "2026-08-28", "2026-08-28T12:00:00Z"),
  ];

  it("returns scene at index in sorted order", () => {
    expect(sceneAtIndex(scenes, 0)?.id).toBe("old");
    expect(sceneAtIndex(scenes, 2)?.id).toBe("new");
    expect(sceneAtIndex(scenes, 5)).toBeNull();
  });

  it("finds index by id", () => {
    expect(indexOfScene(scenes, "mid")).toBe(1);
    expect(indexOfScene(scenes, "missing")).toBe(-1);
  });
});
