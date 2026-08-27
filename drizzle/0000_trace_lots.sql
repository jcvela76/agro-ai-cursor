CREATE TABLE "trace_lots" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"crop_type" text NOT NULL,
	"harvest_season" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"country_of_production" text DEFAULT 'PE' NOT NULL,
	"producer_name" text DEFAULT '' NOT NULL,
	"production_end_date" text,
	"deforestation_free_declared" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trace_events" (
	"id" text PRIMARY KEY NOT NULL,
	"lot_id" text NOT NULL,
	"event_type" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"actor_id" text NOT NULL,
	"evidence_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trace_parcel_links" (
	"parcel_id" text NOT NULL,
	"lot_id" text NOT NULL,
	"linked_at" timestamp with time zone NOT NULL,
	CONSTRAINT "trace_parcel_links_parcel_id_lot_id_pk" PRIMARY KEY("parcel_id","lot_id")
);
--> statement-breakpoint
ALTER TABLE "trace_events" ADD CONSTRAINT "trace_events_lot_id_trace_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."trace_lots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trace_parcel_links" ADD CONSTRAINT "trace_parcel_links_lot_id_trace_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."trace_lots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trace_events_lot_id_idx" ON "trace_events" USING btree ("lot_id");--> statement-breakpoint
CREATE INDEX "trace_lots_org_id_idx" ON "trace_lots" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "trace_parcel_links_lot_id_idx" ON "trace_parcel_links" USING btree ("lot_id");
