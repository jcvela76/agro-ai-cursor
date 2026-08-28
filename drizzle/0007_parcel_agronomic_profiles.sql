CREATE TABLE IF NOT EXISTS "parcel_agronomic_profiles" (
  "parcel_id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "crop" text,
  "sowing_date" text,
  "phenology_stage" text,
  "irrigation_system" text,
  "irrigation_frequency" text,
  "last_application" text,
  "expected_harvest" text,
  "notes" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by_user_id" text
);

CREATE INDEX IF NOT EXISTS "parcel_agronomic_profiles_org_id_idx"
  ON "parcel_agronomic_profiles" ("org_id");
