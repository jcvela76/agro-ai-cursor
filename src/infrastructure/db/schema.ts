import {
  boolean,
  jsonb,
  doublePrecision,
  pgTable,
  text,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import type { ParcelGeometry } from "@/domain/parcel/types";
import type { ReviewDecisionKind } from "@/domain/review/types";
import type { TraceEventType, TraceLotStatus } from "@/domain/traceability/types";

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

export const traceLots = pgTable(
  "trace_lots",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    name: text("name").notNull(),
    cropType: text("crop_type").notNull(),
    harvestSeason: text("harvest_season").notNull(),
    status: text("status").$type<TraceLotStatus>().notNull().default("draft"),
    countryOfProduction: text("country_of_production").notNull().default("PE"),
    producerName: text("producer_name").notNull().default(""),
    productionEndDate: text("production_end_date"),
    deforestationFreeDeclared: boolean("deforestation_free_declared")
      .notNull()
      .default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("trace_lots_org_id_idx").on(table.orgId)],
);

export const traceEvents = pgTable(
  "trace_events",
  {
    id: text("id").primaryKey(),
    lotId: text("lot_id")
      .notNull()
      .references(() => traceLots.id, { onDelete: "cascade" }),
    eventType: text("event_type").$type<TraceEventType>().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    actorId: text("actor_id").notNull(),
    evidenceRef: text("evidence_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("trace_events_lot_id_idx").on(table.lotId)],
);

export const traceParcelLinks = pgTable(
  "trace_parcel_links",
  {
    parcelId: text("parcel_id").notNull(),
    lotId: text("lot_id")
      .notNull()
      .references(() => traceLots.id, { onDelete: "cascade" }),
    linkedAt: timestamp("linked_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.parcelId, table.lotId] }),
    index("trace_parcel_links_lot_id_idx").on(table.lotId),
  ],
);

export const reviewDecisions = pgTable(
  "review_decisions",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    parcelId: text("parcel_id").notNull(),
    kind: text("kind").$type<ReviewDecisionKind>().notNull(),
    summary: text("summary").notNull(),
    rationale: text("rationale").notNull(),
    actorId: text("actor_id").notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }).notNull(),
    evidenceRef: text("evidence_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("review_decisions_org_id_idx").on(table.orgId),
    index("review_decisions_parcel_id_idx").on(table.parcelId),
  ],
);

export const waitlistSignups = pgTable(
  "waitlist_signups",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    source: text("source").notNull().default("landing"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("waitlist_signups_email_idx").on(table.email)],
);
