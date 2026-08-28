import { and, eq } from "drizzle-orm";
import type {
  ParcelAgronomicProfile,
  ParcelAgronomicProfileRegistry,
  UpsertParcelAgronomicProfileInput,
} from "@/domain/parcel/agronomic-profile";
import {
  emptyParcelAgronomicProfile,
  mergeProfileFields,
} from "@/domain/parcel/agronomic-profile";
import type { Db } from "@/infrastructure/db/client";
import { parcelAgronomicProfiles } from "@/infrastructure/db/schema";

export class NeonParcelAgronomicProfileRegistry implements ParcelAgronomicProfileRegistry {
  constructor(private readonly db: Db) {}

  async getByParcelId(orgId: string, parcelId: string): Promise<ParcelAgronomicProfile | null> {
    const rows = await this.db
      .select()
      .from(parcelAgronomicProfiles)
      .where(
        and(
          eq(parcelAgronomicProfiles.orgId, orgId),
          eq(parcelAgronomicProfiles.parcelId, parcelId),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row ? this.toProfile(row) : null;
  }

  async upsert(input: UpsertParcelAgronomicProfileInput): Promise<ParcelAgronomicProfile> {
    const existing = await this.getByParcelId(input.orgId, input.parcelId);
    const base = existing ?? emptyParcelAgronomicProfile(input.orgId, input.parcelId);
    const merged = mergeProfileFields(base, input.fields);
    const now = new Date();

    const rows = await this.db
      .insert(parcelAgronomicProfiles)
      .values({
        parcelId: input.parcelId,
        orgId: input.orgId,
        crop: merged.crop,
        sowingDate: merged.sowingDate,
        phenologyStage: merged.phenologyStage,
        irrigationSystem: merged.irrigationSystem,
        irrigationFrequency: merged.irrigationFrequency,
        lastApplication: merged.lastApplication,
        expectedHarvest: merged.expectedHarvest,
        notes: merged.notes,
        updatedAt: now,
        updatedByUserId: input.updatedByUserId,
      })
      .onConflictDoUpdate({
        target: parcelAgronomicProfiles.parcelId,
        set: {
          orgId: input.orgId,
          crop: merged.crop,
          sowingDate: merged.sowingDate,
          phenologyStage: merged.phenologyStage,
          irrigationSystem: merged.irrigationSystem,
          irrigationFrequency: merged.irrigationFrequency,
          lastApplication: merged.lastApplication,
          expectedHarvest: merged.expectedHarvest,
          notes: merged.notes,
          updatedAt: now,
          updatedByUserId: input.updatedByUserId,
        },
      })
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error("Failed to upsert parcel agronomic profile");
    }
    return this.toProfile(row);
  }

  private toProfile(
    row: typeof parcelAgronomicProfiles.$inferSelect,
  ): ParcelAgronomicProfile {
    return {
      parcelId: row.parcelId,
      orgId: row.orgId,
      crop: row.crop,
      sowingDate: row.sowingDate,
      phenologyStage: row.phenologyStage,
      irrigationSystem: row.irrigationSystem,
      irrigationFrequency: row.irrigationFrequency,
      lastApplication: row.lastApplication,
      expectedHarvest: row.expectedHarvest,
      notes: row.notes,
      updatedAt: row.updatedAt.toISOString(),
      updatedByUserId: row.updatedByUserId,
    };
  }
}
