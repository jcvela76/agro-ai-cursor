import { and, asc, desc, eq, gte } from "drizzle-orm";
import {
  createSpectralSceneId,
  type SpectralSceneRecord,
  type SpectralSceneRegistry,
  type UpsertSpectralSceneInput,
} from "@/domain/spectral/scene-history";
import type { Db } from "@/infrastructure/db/client";
import { spectralScenes } from "@/infrastructure/db/schema";

export class NeonSpectralSceneRegistry implements SpectralSceneRegistry {
  constructor(private readonly db: Db) {}

  async upsert(input: UpsertSpectralSceneInput): Promise<SpectralSceneRecord> {
    const id = createSpectralSceneId(
      input.orgId,
      input.parcelId,
      input.acquisitionDate,
      input.sourceId,
    );
    const now = new Date();
    const rows = await this.db
      .insert(spectralScenes)
      .values({
        id,
        orgId: input.orgId,
        parcelId: input.parcelId,
        acquisitionDate: input.acquisitionDate,
        acquiredAt: input.acquiredAt,
        sourceId: input.sourceId,
        sourceLabel: input.sourceLabel,
        indices: input.indices,
        evidence: input.evidence,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: spectralScenes.id,
        set: {
          acquiredAt: input.acquiredAt,
          sourceLabel: input.sourceLabel,
          indices: input.indices,
          evidence: input.evidence,
          updatedAt: now,
        },
      })
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error("Failed to upsert spectral scene");
    }
    return this.toRecord(row);
  }

  async getLatestByParcel(input: {
    orgId: string;
    parcelId: string;
  }): Promise<SpectralSceneRecord | null> {
    const rows = await this.db
      .select()
      .from(spectralScenes)
      .where(
        and(eq(spectralScenes.orgId, input.orgId), eq(spectralScenes.parcelId, input.parcelId)),
      )
      .orderBy(desc(spectralScenes.acquisitionDate), desc(spectralScenes.acquiredAt))
      .limit(1);
    const row = rows[0];
    return row ? this.toRecord(row) : null;
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

    const rows = await this.db
      .select()
      .from(spectralScenes)
      .where(
        and(
          eq(spectralScenes.orgId, input.orgId),
          eq(spectralScenes.parcelId, input.parcelId),
          gte(spectralScenes.acquisitionDate, cutoff),
        ),
      )
      .orderBy(asc(spectralScenes.acquisitionDate));

    return rows.map((row) => this.toRecord(row));
  }

  private toRecord(row: typeof spectralScenes.$inferSelect): SpectralSceneRecord {
    return {
      id: row.id,
      orgId: row.orgId,
      parcelId: row.parcelId,
      acquisitionDate: row.acquisitionDate,
      acquiredAt: row.acquiredAt,
      sourceId: row.sourceId,
      sourceLabel: row.sourceLabel,
      indices: row.indices,
      evidence: row.evidence,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
