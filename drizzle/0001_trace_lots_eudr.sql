ALTER TABLE "trace_lots" ADD COLUMN IF NOT EXISTS "country_of_production" text DEFAULT 'PE' NOT NULL;
ALTER TABLE "trace_lots" ADD COLUMN IF NOT EXISTS "producer_name" text DEFAULT '' NOT NULL;
ALTER TABLE "trace_lots" ADD COLUMN IF NOT EXISTS "production_end_date" text;
ALTER TABLE "trace_lots" ADD COLUMN IF NOT EXISTS "deforestation_free_declared" boolean DEFAULT false NOT NULL;
