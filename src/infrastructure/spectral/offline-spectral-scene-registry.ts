import {
  createSpectralSceneId,
  type SpectralSceneRecord,
  type SpectralSceneRegistry,
  type UpsertSpectralSceneInput,
} from "@/domain/spectral/scene-history";

function sceneKey(orgId: string, parcelId: string, acquisitionDate: string, sourceId: string): string {
  return `${orgId}|${parcelId}|${acquisitionDate}|${sourceId}`;
}

export class OfflineSpectralSceneRegistry implements SpectralSceneRegistry {
  private readonly byKey = new Map<string, SpectralSceneRecord>();

  async upsert(input: UpsertSpectralSceneInput): Promise<SpectralSceneRecord> {
    const key = sceneKey(input.orgId, input.parcelId, input.acquisitionDate, input.sourceId);
    const existing = this.byKey.get(key);
    const now = new Date().toISOString();
    const record: SpectralSceneRecord = {
      id:
        existing?.id ??
        createSpectralSceneId(input.orgId, input.parcelId, input.acquisitionDate, input.sourceId),
      orgId: input.orgId,
      parcelId: input.parcelId,
      acquisitionDate: input.acquisitionDate,
      acquiredAt: input.acquiredAt,
      sourceId: input.sourceId,
      sourceLabel: input.sourceLabel,
      indices: input.indices,
      evidence: input.evidence,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.byKey.set(key, record);
    return record;
  }

  async listByParcel(input: {
    orgId: string;
    parcelId: string;
    days?: number;
    now?: Date;
  }): Promise<SpectralSceneRecord[]> {
    const days = input.days ?? 90;
    const now = input.now ?? new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    return [...this.byKey.values()]
      .filter(
        (row) =>
          row.orgId === input.orgId &&
          row.parcelId === input.parcelId &&
          row.acquisitionDate >= cutoff,
      )
      .sort((a, b) => a.acquisitionDate.localeCompare(b.acquisitionDate));
  }
}
