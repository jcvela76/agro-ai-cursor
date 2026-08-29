ALTER TABLE "parcel_field_notes" ADD COLUMN IF NOT EXISTS "photo_url" text;
--> statement-breakpoint
ALTER TABLE "parcel_field_notes" ADD COLUMN IF NOT EXISTS "photo_content_type" text;
