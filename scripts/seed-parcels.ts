import { createDb } from "../src/infrastructure/db/client";
import { parcels } from "../src/infrastructure/db/schema";
import type { ParcelGeometry } from "../src/domain/parcel/types";
import seed from "../src/infrastructure/fixtures/synthetic-parcels.json";

async function main() {
  const db = createDb(process.env.DATABASE_URL);
  for (const parcel of seed) {
    const geometry = (parcel.geometry ?? null) as ParcelGeometry | null;
    await db
      .insert(parcels)
      .values({
        id: parcel.id,
        orgId: parcel.orgId,
        name: parcel.name,
        latitude: parcel.latitude,
        longitude: parcel.longitude,
        timezone: parcel.timezone,
        geometry,
      })
      .onConflictDoUpdate({
        target: parcels.id,
        set: {
          orgId: parcel.orgId,
          name: parcel.name,
          latitude: parcel.latitude,
          longitude: parcel.longitude,
          timezone: parcel.timezone,
          geometry,
        },
      });
  }
  console.log(`Seeded ${seed.length} parcels`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
