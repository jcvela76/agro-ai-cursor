import {
  createSpectralZoneSnapshotId,
  type SpectralZoneSnapshotRecord,
  type SpectralZoneSnapshotRegistry,
  type UpsertSpectralZoneSnapshotInput,
  type VegetationIndexId,
} from "@/domain/spectral/zone-history";

function sceneKey(
  orgId: string,
  parcelId: string,
  acquisitionDate: string,
  sourceId: string,
  indexId: VegetationIndexId,
): string {
  return `${orgId}|${parcelId}|${acquisitionDate}|${sourceId}|${indexId}`;
}

export class OfflineSpectralZoneSnapshotRegistry implements SpectralZoneSnapshotRegistry {
  private readonly byKey = new Map<string, SpectralZoneSnapshotRecord>();

  async upsert(input: UpsertSpectralZoneSnapshotInput): Promise<SpectralZoneSnapshotRecord> {
    const key = sceneKey(
      input.orgId,
      input.parcelId,
      input.acquisitionDate,
      input.sourceId,
      input.indexId,
    );
    const existing = this.byKey.get(key);
    const now = new Date().toISOString();
    const record: SpectralZoneSnapshotRecord = {
      id:
        existing?.id ??
        createSpectralZoneSnapshotId(
          input.orgId,
          input.parcelId,
          input.acquisitionDate,
          input.sourceId,
          input.indexId,
        ),
      orgId: input.orgId,
      parcelId: input.parcelId,
      acquisitionDate: input.acquisitionDate,
      acquiredAt: input.acquiredAt,
      sourceId: input.sourceId,
      indexId: input.indexId,
      parcelMean: input.parcelMean,
      methodId: input.methodId,
      zones: input.zones,
      evidence: input.evidence,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.byKey.set(key, record);
    return record;
  }

  async getBySceneKey(input: {
    orgId: string;
    parcelId: string;
    acquisitionDate: string;
    sourceId: string;
    indexId: VegetationIndexId;
  }): Promise<SpectralZoneSnapshotRecord | null> {
    return (
      this.byKey.get(
        sceneKey(
          input.orgId,
          input.parcelId,
          input.acquisitionDate,
          input.sourceId,
          input.indexId,
        ),
      ) ?? null
    );
  }
}
