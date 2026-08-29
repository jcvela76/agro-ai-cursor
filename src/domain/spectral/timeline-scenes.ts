import type { SpectralSceneRecord } from "@/domain/spectral/scene-history";

/** Oldest → newest by acquisition date and capture time. */
export function sortScenesAsc(scenes: SpectralSceneRecord[]): SpectralSceneRecord[] {
  return [...scenes].sort((a, b) => {
    if (a.acquisitionDate !== b.acquisitionDate) {
      return a.acquisitionDate.localeCompare(b.acquisitionDate);
    }
    return a.acquiredAt.localeCompare(b.acquiredAt);
  });
}

export function sceneAtIndex(
  scenes: SpectralSceneRecord[],
  index: number,
): SpectralSceneRecord | null {
  const sorted = sortScenesAsc(scenes);
  if (index < 0 || index >= sorted.length) {
    return null;
  }
  return sorted[index] ?? null;
}

export function indexOfScene(
  scenes: SpectralSceneRecord[],
  sceneId: string,
): number {
  const sorted = sortScenesAsc(scenes);
  return sorted.findIndex((scene) => scene.id === sceneId);
}

export const SPECTRAL_TIMELINE_PLAY_MS = 1200;
