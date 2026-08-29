import type {
  SpectralEvidence,
  SpectralZone,
  VegetationIndexId,
} from "@/domain/spectral/types";

export type { SpectralEvidence, SpectralZone, VegetationIndexId };

/** Persisted within-parcel zone snapshot for one scene + vegetation index. */
export interface SpectralZoneSnapshotRecord {
  id: string;
  orgId: string;
  parcelId: string;
  acquisitionDate: string;
  acquiredAt: string;
  sourceId: string;
  indexId: VegetationIndexId;
  parcelMean: number | null;
  methodId: string;
  zones: SpectralZone[];
  evidence: SpectralEvidence;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertSpectralZoneSnapshotInput {
  orgId: string;
  parcelId: string;
  acquisitionDate: string;
  acquiredAt: string;
  sourceId: string;
  indexId: VegetationIndexId;
  parcelMean: number | null;
  methodId: string;
  zones: SpectralZone[];
  evidence: SpectralEvidence;
}

export interface SpectralZoneSnapshotRegistry {
  upsert(input: UpsertSpectralZoneSnapshotInput): Promise<SpectralZoneSnapshotRecord>;
  getBySceneKey(input: {
    orgId: string;
    parcelId: string;
    acquisitionDate: string;
    sourceId: string;
    indexId: VegetationIndexId;
  }): Promise<SpectralZoneSnapshotRecord | null>;
}

export function createSpectralZoneSnapshotId(
  orgId: string,
  parcelId: string,
  acquisitionDate: string,
  sourceId: string,
  indexId: VegetationIndexId,
): string {
  return `sz_${orgId}_${parcelId}_${acquisitionDate}_${sourceId}_${indexId}`.replace(
    /[^a-zA-Z0-9_-]/g,
    "_",
  );
}
