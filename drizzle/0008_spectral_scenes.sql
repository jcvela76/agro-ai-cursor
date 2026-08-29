CREATE TABLE IF NOT EXISTS "spectral_scenes" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "parcel_id" text NOT NULL,
  "acquisition_date" text NOT NULL,
  "acquired_at" text NOT NULL,
  "source_id" text NOT NULL,
  "source_label" text NOT NULL,
  "indices" jsonb NOT NULL,
  "evidence" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "spectral_scenes_org_parcel_day_source_uidx"
  ON "spectral_scenes" ("org_id", "parcel_id", "acquisition_date", "source_id");

CREATE INDEX IF NOT EXISTS "spectral_scenes_org_parcel_idx"
  ON "spectral_scenes" ("org_id", "parcel_id");

CREATE INDEX IF NOT EXISTS "spectral_scenes_parcel_date_idx"
  ON "spectral_scenes" ("parcel_id", "acquisition_date");
