import type { SpectralSceneRecord } from "@/domain/spectral/scene-history";
import type { ParcelVegetationIndices, VegetationIndexReading } from "@/domain/spectral/types";
import { VEGETATION_INDEX_CATALOG } from "@/domain/spectral/vegetation-indices";

/** Rebuild parcel indices payload from a persisted scene (Neon / offline registry). */
export function vegetationIndicesFromScene(scene: SpectralSceneRecord): ParcelVegetationIndices {
  const indices: VegetationIndexReading[] = scene.indices.map((item) => {
    const meta = VEGETATION_INDEX_CATALOG[item.id];
    return {
      id: item.id,
      label: meta.label,
      description: meta.description,
      methodId: meta.methodId,
      value: item.value,
    };
  });

  return {
    kind: "vegetation_indices",
    acquisitionDate: scene.acquisitionDate,
    indices,
    evidence: {
      ...scene.evidence,
      freshnessPolicy: `${scene.evidence.freshnessPolicy}|cache_read`,
    },
  };
}
