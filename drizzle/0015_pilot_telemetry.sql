CREATE TABLE IF NOT EXISTS "pilot_events" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "user_id" text NOT NULL,
  "event_name" text NOT NULL,
  "payload" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "pilot_events_org_created_idx" ON "pilot_events" USING btree ("org_id","created_at");
CREATE INDEX IF NOT EXISTS "pilot_events_name_created_idx" ON "pilot_events" USING btree ("event_name","created_at");

CREATE TABLE IF NOT EXISTS "pilot_feedback" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "user_id" text NOT NULL,
  "kind" text NOT NULL,
  "rating" text,
  "flow" text,
  "body" text NOT NULL,
  "meta" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "pilot_feedback_org_created_idx" ON "pilot_feedback" USING btree ("org_id","created_at");

CREATE TABLE IF NOT EXISTS "pilot_error_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text,
  "user_id" text,
  "source" text NOT NULL,
  "message" text NOT NULL,
  "stack" text,
  "route" text,
  "user_agent" text,
  "severity" text DEFAULT 'error' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "pilot_error_logs_created_idx" ON "pilot_error_logs" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "pilot_error_logs_source_created_idx" ON "pilot_error_logs" USING btree ("source","created_at");
