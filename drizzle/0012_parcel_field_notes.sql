CREATE TABLE IF NOT EXISTS "parcel_field_notes" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "parcel_id" text NOT NULL,
  "body" text NOT NULL,
  "zone_label" text,
  "observed_at" timestamp with time zone NOT NULL,
  "author_user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "parcel_field_notes_org_parcel_observed_idx"
  ON "parcel_field_notes" ("org_id", "parcel_id", "observed_at" DESC);
