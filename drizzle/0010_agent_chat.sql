CREATE TABLE IF NOT EXISTS "agent_chat_messages" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "parcel_id" text NOT NULL,
  "role" text NOT NULL,
  "parts" jsonb NOT NULL,
  "author_user_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "agent_chat_messages_org_parcel_created_idx"
  ON "agent_chat_messages" ("org_id", "parcel_id", "created_at" DESC);
