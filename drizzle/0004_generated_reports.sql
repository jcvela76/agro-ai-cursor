CREATE TABLE IF NOT EXISTS "generated_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "created_by_user_id" text NOT NULL,
  "report_type" text NOT NULL,
  "title" text NOT NULL,
  "parcel_id" text,
  "lot_id" text,
  "billing_month" text NOT NULL,
  "html_content" text NOT NULL,
  "pdf_base64" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "generated_reports_org_id_idx" ON "generated_reports" ("org_id");
CREATE INDEX IF NOT EXISTS "generated_reports_org_month_idx" ON "generated_reports" ("org_id", "billing_month");
