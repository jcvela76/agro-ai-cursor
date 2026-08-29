import type { SpectralEvidence, VegetationIndexId } from "@/domain/spectral/types";

export type { SpectralEvidence };

export interface SpectralSceneIndexValue {
  id: VegetationIndexId;
  value: number | null;
}

/** One persisted spectral scene (parcel-level means for a calendar acquisition day). */
export interface SpectralSceneRecord {
  id: string;
  orgId: string;
  parcelId: string;
  /** YYYY-MM-DD (UTC date of acquisition). */
  acquisitionDate: string;
  acquiredAt: string;
  sourceId: string;
  sourceLabel: string;
  indices: SpectralSceneIndexValue[];
  evidence: SpectralEvidence;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertSpectralSceneInput {
  orgId: string;
  parcelId: string;
  acquisitionDate: string;
  acquiredAt: string;
  sourceId: string;
  sourceLabel: string;
  indices: SpectralSceneIndexValue[];
  evidence: SpectralEvidence;
}

export interface SpectralSceneRegistry {
  upsert(input: UpsertSpectralSceneInput): Promise<SpectralSceneRecord>;
  listByParcel(input: {
    orgId: string;
    parcelId: string;
    /** Inclusive lookback in days from `now` (default 90). */
    days?: number;
    now?: Date;
  }): Promise<SpectralSceneRecord[]>;
}

export function createSpectralSceneId(
  orgId: string,
  parcelId: string,
  acquisitionDate: string,
  sourceId: string,
): string {
  return `ss_${orgId}_${parcelId}_${acquisitionDate}_${sourceId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}
