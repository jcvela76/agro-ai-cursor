CREATE TABLE IF NOT EXISTS "spectral_zone_snapshots" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "parcel_id" text NOT NULL,
  "acquisition_date" text NOT NULL,
  "acquired_at" text NOT NULL,
  "source_id" text NOT NULL,
  "index_id" text NOT NULL,
  "parcel_mean" double precision,
  "method_id" text NOT NULL,
  "zones" jsonb NOT NULL,
  "evidence" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "spectral_zone_snapshots_scene_index_uidx"
  ON "spectral_zone_snapshots" ("org_id", "parcel_id", "acquisition_date", "source_id", "index_id");

CREATE INDEX IF NOT EXISTS "spectral_zone_snapshots_org_parcel_idx"
  ON "spectral_zone_snapshots" ("org_id", "parcel_id");

CREATE INDEX IF NOT EXISTS "spectral_zone_snapshots_parcel_date_idx"
  ON "spectral_zone_snapshots" ("parcel_id", "acquisition_date");
