import { jsonb, doublePrecision, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { ParcelGeometry } from "@/domain/parcel/types";

export const parcels = pgTable("parcels", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  timezone: text("timezone").notNull().default("America/Lima"),
  geometry: jsonb("geometry").$type<ParcelGeometry | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
