import { and, eq } from "drizzle-orm";
import {
  createSpectralZoneSnapshotId,
  type SpectralZoneSnapshotRecord,
  type SpectralZoneSnapshotRegistry,
  type UpsertSpectralZoneSnapshotInput,
  type VegetationIndexId,
} from "@/domain/spectral/zone-history";
import type { Db } from "@/infrastructure/db/client";
import { spectralZoneSnapshots } from "@/infrastructure/db/schema";

export class NeonSpectralZoneSnapshotRegistry implements SpectralZoneSnapshotRegistry {
  constructor(private readonly db: Db) {}

  async upsert(input: UpsertSpectralZoneSnapshotInput): Promise<SpectralZoneSnapshotRecord> {
    const id = createSpectralZoneSnapshotId(
      input.orgId,
      input.parcelId,
      input.acquisitionDate,
      input.sourceId,
      input.indexId,
    );
    const now = new Date();
    const rows = await this.db
      .insert(spectralZoneSnapshots)
      .values({
        id,
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
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: spectralZoneSnapshots.id,
        set: {
          acquiredAt: input.acquiredAt,
          parcelMean: input.parcelMean,
          methodId: input.methodId,
          zones: input.zones,
          evidence: input.evidence,
          updatedAt: now,
        },
      })
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error("Failed to upsert spectral zone snapshot");
    }
    return this.toRecord(row);
  }

  async getBySceneKey(input: {
    orgId: string;
    parcelId: string;
    acquisitionDate: string;
    sourceId: string;
    indexId: VegetationIndexId;
  }): Promise<SpectralZoneSnapshotRecord | null> {
    const rows = await this.db
      .select()
      .from(spectralZoneSnapshots)
      .where(
        and(
          eq(spectralZoneSnapshots.orgId, input.orgId),
          eq(spectralZoneSnapshots.parcelId, input.parcelId),
          eq(spectralZoneSnapshots.acquisitionDate, input.acquisitionDate),
          eq(spectralZoneSnapshots.sourceId, input.sourceId),
          eq(spectralZoneSnapshots.indexId, input.indexId),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row ? this.toRecord(row) : null;
  }

  private toRecord(
    row: typeof spectralZoneSnapshots.$inferSelect,
  ): SpectralZoneSnapshotRecord {
    return {
      id: row.id,
      orgId: row.orgId,
      parcelId: row.parcelId,
      acquisitionDate: row.acquisitionDate,
      acquiredAt: row.acquiredAt,
      sourceId: row.sourceId,
      indexId: row.indexId,
      parcelMean: row.parcelMean,
      methodId: row.methodId,
      zones: row.zones,
      evidence: row.evidence,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
