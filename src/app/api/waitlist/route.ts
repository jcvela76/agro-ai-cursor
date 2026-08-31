import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const QUALIFIER_MAX = 80;

function optionalQualifier(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > QUALIFIER_MAX) {
    return null;
  }
  return trimmed;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const payload = typeof body === "object" && body !== null ? body : {};
  const emailRaw = "email" in payload ? String((payload as { email: unknown }).email) : "";
  const email = emailRaw.trim().toLowerCase();
  const role = optionalQualifier("role" in payload ? payload.role : null);
  const region = optionalQualifier("region" in payload ? payload.region : null);
  const crop = optionalQualifier("crop" in payload ? payload.crop : null);

  if (!EMAIL_RE.test(email) || email.length > 320) {
    return NextResponse.json(
      { ok: false, error: "Ingresa un correo válido." },
      { status: 400 },
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  try {
    const sql = neon(databaseUrl);
    await sql`
      CREATE TABLE IF NOT EXISTS waitlist_signups (
        id text PRIMARY KEY NOT NULL,
        email text NOT NULL,
        source text DEFAULT 'landing' NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        CONSTRAINT waitlist_signups_email_unique UNIQUE (email)
      )
    `;
    await sql`
      ALTER TABLE waitlist_signups ADD COLUMN IF NOT EXISTS role text
    `;
    await sql`
      ALTER TABLE waitlist_signups ADD COLUMN IF NOT EXISTS region text
    `;
    await sql`
      ALTER TABLE waitlist_signups ADD COLUMN IF NOT EXISTS crop text
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS waitlist_signups_email_idx
      ON waitlist_signups USING btree (email)
    `;
    const id = `wl_${crypto.randomUUID()}`;
    await sql`
      INSERT INTO waitlist_signups (id, email, source, role, region, crop)
      VALUES (${id}, ${email}, ${"landing"}, ${role}, ${region}, ${crop})
      ON CONFLICT (email) DO UPDATE SET
        role = COALESCE(EXCLUDED.role, waitlist_signups.role),
        region = COALESCE(EXCLUDED.region, waitlist_signups.region),
        crop = COALESCE(EXCLUDED.crop, waitlist_signups.crop)
    `;
    return NextResponse.json({ ok: true, persisted: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo guardar. Intenta más tarde." },
      { status: 500 },
    );
  }
}
