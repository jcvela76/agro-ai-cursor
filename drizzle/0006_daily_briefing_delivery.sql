CREATE TABLE IF NOT EXISTS "daily_briefing_delivery_prefs" (
  "org_id" text PRIMARY KEY NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "channels" jsonb DEFAULT '["email"]'::jsonb NOT NULL,
  "send_at_local" text DEFAULT '06:00' NOT NULL,
  "parcel_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "email_recipients" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
