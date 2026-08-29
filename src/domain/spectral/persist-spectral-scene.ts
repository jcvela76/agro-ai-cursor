import type {
  SpectralSceneRecord,
  SpectralSceneRegistry,
  UpsertSpectralSceneInput,
} from "@/domain/spectral/scene-history";
import type { ParcelVegetationIndices } from "@/domain/spectral/types";

export type SpectralScenePersistMode = "always" | "new_scene_only";

export interface PersistSpectralSceneResult {
  persisted: boolean;
  record: SpectralSceneRecord | null;
  skippedReason?: "same_acquisition_scene";
}

export function buildSpectralSceneUpsert(
  orgId: string,
  parcelId: string,
  data: ParcelVegetationIndices,
): UpsertSpectralSceneInput {
  return {
    orgId,
    parcelId,
    acquisitionDate: data.acquisitionDate,
    acquiredAt: data.evidence.acquiredAt,
    sourceId: data.evidence.sourceId,
    sourceLabel: data.evidence.sourceLabel,
    indices: data.indices.map((item) => ({ id: item.id, value: item.value })),
    evidence: data.evidence,
  };
}

export function isNewAcquisitionScene(
  latest: SpectralSceneRecord | null,
  incoming: Pick<UpsertSpectralSceneInput, "acquisitionDate" | "sourceId" | "acquiredAt">,
): boolean {
  if (!latest) {
    return true;
  }
  if (latest.acquisitionDate !== incoming.acquisitionDate) {
    return true;
  }
  if (latest.sourceId !== incoming.sourceId) {
    return true;
  }
  // Same calendar day but satellite timestamp moved (e.g. refined scene in bucket).
  return latest.acquiredAt !== incoming.acquiredAt;
}

export async function persistSpectralScene(
  registry: SpectralSceneRegistry,
  input: UpsertSpectralSceneInput,
  mode: SpectralScenePersistMode,
): Promise<PersistSpectralSceneResult> {
  const latest = await registry.getLatestByParcel({
    orgId: input.orgId,
    parcelId: input.parcelId,
  });

  if (mode === "new_scene_only" && !isNewAcquisitionScene(latest, input)) {
    return {
      persisted: false,
      record: latest,
      skippedReason: "same_acquisition_scene",
    };
  }

  const record = await registry.upsert(input);
  return { persisted: true, record };
}

/** User-facing label for satellite capture time (not DB `updatedAt`). */
export function formatSceneCapturedAt(acquiredAt: string, timezone = "America/Lima"): string {
  const parsed = Date.parse(acquiredAt);
  if (!Number.isFinite(parsed)) {
    return acquiredAt;
  }
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(parsed));
}
