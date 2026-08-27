/**
 * Hygiene: remove Lima Coffee smoke parcels/lots; keep fixture Norte + lotes A/B.
 *
 * Dry-run by default. Apply with APPLY=1.
 *
 *   npx tsx scripts/cleanup-lima-coffee-smoke.ts
 *   APPLY=1 npx tsx scripts/cleanup-lima-coffee-smoke.ts
 */
import { inArray } from "drizzle-orm";
import { createDb } from "../src/infrastructure/db/client";
import { parcels, traceLots } from "../src/infrastructure/db/schema";

const SMOKE_LOT_IDS = [
  "lot-f7c2dfad-d1e4-4ca7-9a95-14c5214d7f90", // Lote smoke Neon visual
  "lot-a61ee4ed-9a82-451f-a503-6d22650c9f40", // Smoke EUDR incomplete
  "lot-4cf24335-c65b-43d9-8c59-4e2e095bf30d", // Smoke EUDR ready
] as const;

const SMOKE_PARCEL_IDS = [
  "parcel-d98762d0-e0f5-4b92-b0e4-5c8bb258aba4", // Parcela 1 (overlaps Norte)
  "parcel-45915b52-46a3-4c37-969c-bdea7ca82941", // Smoke Chosica Este
  "parcel-bcaa6e38-c8a4-40f6-a967-80d1d1a57963", // Smoke Cañete Sur
] as const;

async function main() {
  const apply = process.env.APPLY === "1";
  const db = createDb(process.env.DATABASE_URL);

  console.log(
    apply
      ? "APPLY: deleting Lima Coffee smoke lots/parcels"
      : "DRY-RUN: set APPLY=1 to delete",
  );
  console.log("lots:", SMOKE_LOT_IDS.join(", "));
  console.log("parcels:", SMOKE_PARCEL_IDS.join(", "));

  if (!apply) {
    return;
  }

  await db.delete(traceLots).where(inArray(traceLots.id, [...SMOKE_LOT_IDS]));
  await db.delete(parcels).where(inArray(parcels.id, [...SMOKE_PARCEL_IDS]));
  console.log("DONE");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
