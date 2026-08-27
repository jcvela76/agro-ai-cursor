import { doublePrecision, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const parcels = pgTable("parcels", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  timezone: text("timezone").notNull().default("America/Lima"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
