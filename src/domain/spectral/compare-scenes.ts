import type { VegetationIndexId } from "@/domain/spectral/types";
import type { SpectralSceneRecord } from "@/domain/spectral/scene-history";

export interface SpectralSceneIndexCompare {
  indexId: VegetationIndexId;
  earlierValue: number | null;
  laterValue: number | null;
  delta: number | null;
}

export interface SpectralSceneCompare {
  earlier: SpectralSceneRecord;
  later: SpectralSceneRecord;
  byIndex: SpectralSceneIndexCompare[];
}

function reading(
  scene: SpectralSceneRecord,
  indexId: VegetationIndexId,
): number | null {
  const value = scene.indices.find((item) => item.id === indexId)?.value;
  return value == null || !Number.isFinite(value) ? null : value;
}

/** Order two scenes by acquisition date and compute per-index deltas (later − earlier). */
export function compareSpectralScenes(
  a: SpectralSceneRecord,
  b: SpectralSceneRecord,
  indexIds: readonly VegetationIndexId[],
): SpectralSceneCompare {
  const [earlier, later] =
    a.acquisitionDate <= b.acquisitionDate ? [a, b] : [b, a];
  const byIndex = indexIds.map((indexId) => {
    const earlierValue = reading(earlier, indexId);
    const laterValue = reading(later, indexId);
    const delta =
      earlierValue == null || laterValue == null
        ? null
        : Number((laterValue - earlierValue).toFixed(4));
    return { indexId, earlierValue, laterValue, delta };
  });
  return { earlier, later, byIndex };
}

export function sceneMeansFromRecord(
  scene: SpectralSceneRecord,
): Partial<Record<VegetationIndexId, number | null>> {
  const means: Partial<Record<VegetationIndexId, number | null>> = {};
  for (const index of scene.indices) {
    means[index.id] = index.value;
  }
  return means;
}
