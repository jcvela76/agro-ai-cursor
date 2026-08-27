import { eq } from "drizzle-orm";
import type { Parcel, ParcelRegistry } from "@/domain/parcel/types";
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
    return {
      id: row.id,
      orgId: row.orgId,
      name: row.name,
      latitude: row.latitude,
      longitude: row.longitude,
      timezone: row.timezone,
    };
  }
}
