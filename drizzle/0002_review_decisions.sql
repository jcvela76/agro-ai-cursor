CREATE TABLE "review_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"parcel_id" text NOT NULL,
	"kind" text NOT NULL,
	"summary" text NOT NULL,
	"rationale" text NOT NULL,
	"actor_id" text NOT NULL,
	"decided_at" timestamp with time zone NOT NULL,
	"evidence_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "review_decisions_org_id_idx" ON "review_decisions" USING btree ("org_id");
--> statement-breakpoint
CREATE INDEX "review_decisions_parcel_id_idx" ON "review_decisions" USING btree ("parcel_id");
