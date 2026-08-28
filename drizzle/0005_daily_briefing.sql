ALTER TABLE "generated_reports" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ready' NOT NULL;
ALTER TABLE "generated_reports" ADD COLUMN IF NOT EXISTS "report_day" text;
ALTER TABLE "generated_reports" ADD COLUMN IF NOT EXISTS "parent_report_id" text;
ALTER TABLE "generated_reports" ADD COLUMN IF NOT EXISTS "context_snapshot" jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS "generated_reports_daily_ready_unique_idx"
  ON "generated_reports" ("org_id", "parcel_id", "report_day")
  WHERE "report_type" = 'daily_briefing' AND "status" = 'ready';

CREATE INDEX IF NOT EXISTS "generated_reports_parcel_day_idx"
  ON "generated_reports" ("org_id", "parcel_id", "report_day");
