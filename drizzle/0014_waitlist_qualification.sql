ALTER TABLE "waitlist_signups" ADD COLUMN IF NOT EXISTS "role" text;
ALTER TABLE "waitlist_signups" ADD COLUMN IF NOT EXISTS "region" text;
ALTER TABLE "waitlist_signups" ADD COLUMN IF NOT EXISTS "crop" text;
