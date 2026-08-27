import { and, eq } from "drizzle-orm";
import type {
  CreateParcelInput,
  Parcel,
  ParcelGeometry,
  ParcelRegistry,
  UpdateParcelInput,
} from "@/domain/parcel/types";
import type { Db } from "@/infrastructure/db/client";
import { parcels } from "@/infrastructure/db/schema";

export class NeonParcelRegistry implements ParcelRegistry {
  constructor(private readonly db: Db) {}

  async getParcel(parcelId: string): Promise<Parcel | undefined> {
    const rows = await this.db.select().from(parcels).where(eq(parcels.id, parcelId)).limit(1);
    const row = rows[0];
    if (!row) {
      return undefined;
    }
    return this.toParcel(row);
  }

  async listByOrgId(orgId: string): Promise<Parcel[]> {
    const rows = await this.db.select().from(parcels).where(eq(parcels.orgId, orgId));
    return rows.map((row) => this.toParcel(row));
  }

  async create(input: CreateParcelInput): Promise<Parcel> {
    const rows = await this.db
      .insert(parcels)
      .values({
        id: input.id,
        orgId: input.orgId,
        name: input.name,
        latitude: input.latitude,
        longitude: input.longitude,
        timezone: input.timezone,
        geometry: input.geometry,
      })
      .returning();
    return this.toParcel(rows[0]);
  }

  async update(parcelId: string, input: UpdateParcelInput): Promise<Parcel | undefined> {
    const patch: Partial<typeof parcels.$inferInsert> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.latitude !== undefined) patch.latitude = input.latitude;
    if (input.longitude !== undefined) patch.longitude = input.longitude;
    if (input.timezone !== undefined) patch.timezone = input.timezone;
    if (input.geometry !== undefined) patch.geometry = input.geometry;

    if (Object.keys(patch).length === 0) {
      return this.getParcel(parcelId);
    }

    const rows = await this.db
      .update(parcels)
      .set(patch)
      .where(eq(parcels.id, parcelId))
      .returning();
    const row = rows[0];
    return row ? this.toParcel(row) : undefined;
  }

  async delete(parcelId: string): Promise<boolean> {
    const rows = await this.db.delete(parcels).where(eq(parcels.id, parcelId)).returning({
      id: parcels.id,
    });
    return rows.length > 0;
  }

  /** Ensure delete only within org (used by use cases after load). */
  async deleteInOrg(parcelId: string, orgId: string): Promise<boolean> {
    const rows = await this.db
      .delete(parcels)
      .where(and(eq(parcels.id, parcelId), eq(parcels.orgId, orgId)))
      .returning({ id: parcels.id });
    return rows.length > 0;
  }

  private toParcel(row: typeof parcels.$inferSelect): Parcel {
    return {
      id: row.id,
      orgId: row.orgId,
      name: row.name,
      latitude: row.latitude,
      longitude: row.longitude,
      timezone: row.timezone,
      geometry: (row.geometry as ParcelGeometry | null) ?? null,
    };
  }
}
