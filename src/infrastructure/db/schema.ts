import {
  boolean,
  jsonb,
  doublePrecision,
  pgTable,
  text,
  timestamp,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { DailyBriefingContextSnapshot } from "@/domain/report/daily-briefing";
import type { ParcelGeometry } from "@/domain/parcel/types";
import type { ReviewDecisionKind } from "@/domain/review/types";
import type {
  SpectralEvidence,
  SpectralSceneIndexValue,
} from "@/domain/spectral/scene-history";
import type { SpectralZone, VegetationIndexId } from "@/domain/spectral/types";
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

export const generatedReports = pgTable(
  "generated_reports",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    createdByUserId: text("created_by_user_id").notNull(),
    reportType: text("report_type").notNull(),
    status: text("status").notNull().default("ready"),
    title: text("title").notNull(),
    parcelId: text("parcel_id"),
    lotId: text("lot_id"),
    reportDay: text("report_day"),
    billingMonth: text("billing_month").notNull(),
    parentReportId: text("parent_report_id"),
    contextSnapshot: jsonb("context_snapshot").$type<DailyBriefingContextSnapshot | null>(),
    htmlContent: text("html_content").notNull(),
    pdfBase64: text("pdf_base64").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("generated_reports_org_id_idx").on(table.orgId),
    index("generated_reports_org_month_idx").on(table.orgId, table.billingMonth),
    index("generated_reports_parcel_day_idx").on(table.orgId, table.parcelId, table.reportDay),
  ],
);

export const dailyBriefingDeliveryPrefs = pgTable("daily_briefing_delivery_prefs", {
  orgId: text("org_id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  channels: jsonb("channels").$type<string[]>().notNull().default(["email"]),
  sendAtLocal: text("send_at_local").notNull().default("06:00"),
  parcelIds: jsonb("parcel_ids").$type<string[]>().notNull().default([]),
  emailRecipients: jsonb("email_recipients").$type<string[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const parcelAgronomicProfiles = pgTable(
  "parcel_agronomic_profiles",
  {
    parcelId: text("parcel_id").primaryKey(),
    orgId: text("org_id").notNull(),
    crop: text("crop"),
    cropKey: text("crop_key"),
    sowingDate: text("sowing_date"),
    phenologyStage: text("phenology_stage"),
    irrigationSystem: text("irrigation_system"),
    irrigationFrequency: text("irrigation_frequency"),
    lastApplication: text("last_application"),
    expectedHarvest: text("expected_harvest"),
    notes: text("notes"),
    gddBaseCelsius: doublePrecision("gdd_base_celsius"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    updatedByUserId: text("updated_by_user_id"),
  },
  (table) => [index("parcel_agronomic_profiles_org_id_idx").on(table.orgId)],
);

export const spectralScenes = pgTable(
  "spectral_scenes",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    parcelId: text("parcel_id").notNull(),
    acquisitionDate: text("acquisition_date").notNull(),
    acquiredAt: text("acquired_at").notNull(),
    sourceId: text("source_id").notNull(),
    sourceLabel: text("source_label").notNull(),
    indices: jsonb("indices").$type<SpectralSceneIndexValue[]>().notNull(),
    evidence: jsonb("evidence").$type<SpectralEvidence>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("spectral_scenes_org_parcel_day_source_uidx").on(
      table.orgId,
      table.parcelId,
      table.acquisitionDate,
      table.sourceId,
    ),
    index("spectral_scenes_org_parcel_idx").on(table.orgId, table.parcelId),
    index("spectral_scenes_parcel_date_idx").on(table.parcelId, table.acquisitionDate),
  ],
);

export const spectralZoneSnapshots = pgTable(
  "spectral_zone_snapshots",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    parcelId: text("parcel_id").notNull(),
    acquisitionDate: text("acquisition_date").notNull(),
    acquiredAt: text("acquired_at").notNull(),
    sourceId: text("source_id").notNull(),
    indexId: text("index_id").$type<VegetationIndexId>().notNull(),
    parcelMean: doublePrecision("parcel_mean"),
    methodId: text("method_id").notNull(),
    zones: jsonb("zones").$type<SpectralZone[]>().notNull(),
    evidence: jsonb("evidence").$type<SpectralEvidence>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("spectral_zone_snapshots_scene_index_uidx").on(
      table.orgId,
      table.parcelId,
      table.acquisitionDate,
      table.sourceId,
      table.indexId,
    ),
    index("spectral_zone_snapshots_org_parcel_idx").on(table.orgId, table.parcelId),
    index("spectral_zone_snapshots_parcel_date_idx").on(
      table.parcelId,
      table.acquisitionDate,
    ),
  ],
);

export type AgentChatMessageRole = "user" | "assistant" | "system";

export type AgentChatMessagePart = {
  type: "text";
  text: string;
};

export const agentChatMessages = pgTable(
  "agent_chat_messages",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    parcelId: text("parcel_id").notNull(),
    role: text("role").$type<AgentChatMessageRole>().notNull(),
    parts: jsonb("parts").$type<AgentChatMessagePart[]>().notNull(),
    authorUserId: text("author_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("agent_chat_messages_org_parcel_created_idx").on(
      table.orgId,
      table.parcelId,
      table.createdAt,
    ),
  ],
);

