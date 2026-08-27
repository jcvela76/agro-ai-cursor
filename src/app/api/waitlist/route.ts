import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function ensureTable(sql: ReturnType<typeof neon>) {
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
    CREATE INDEX IF NOT EXISTS waitlist_signups_email_idx
    ON waitlist_signups USING btree (email)
  `;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const emailRaw =
    typeof body === "object" && body !== null && "email" in body
      ? String((body as { email: unknown }).email)
      : "";
  const email = emailRaw.trim().toLowerCase();

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
    await ensureTable(sql);
    const id = `wl_${crypto.randomUUID()}`;
    await sql`
      INSERT INTO waitlist_signups (id, email, source)
      VALUES (${id}, ${email}, ${"landing"})
      ON CONFLICT (email) DO NOTHING
    `;
    return NextResponse.json({ ok: true, persisted: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo guardar. Intenta más tarde." },
      { status: 500 },
    );
  }
}
