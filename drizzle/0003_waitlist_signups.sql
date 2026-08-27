CREATE TABLE IF NOT EXISTS "waitlist_signups" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"source" text DEFAULT 'landing' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_signups_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "waitlist_signups_email_idx" ON "waitlist_signups" USING btree ("email");
