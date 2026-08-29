ALTER TABLE "parcel_agronomic_profiles" ADD COLUMN IF NOT EXISTS "crop_key" text;
ALTER TABLE "parcel_agronomic_profiles" ADD COLUMN IF NOT EXISTS "gdd_base_celsius" double precision;
