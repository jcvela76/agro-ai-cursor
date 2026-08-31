import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { insertPilotEvent } from "@/infrastructure/pilot/neon-pilot-telemetry";

const EVENT_NAME_RE = /^[a-z][a-z0-9._-]{1,118}$/;

export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ ok: false, error: "Auth requerida." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const eventName =
    typeof body === "object" && body !== null && "eventName" in body
      ? String((body as { eventName: unknown }).eventName)
      : "";
  if (!EVENT_NAME_RE.test(eventName)) {
    return NextResponse.json({ ok: false, error: "eventName inválido." }, { status: 400 });
  }

  const rawPayload =
    typeof body === "object" && body !== null && "payload" in body
      ? (body as { payload: unknown }).payload
      : null;
  const payload =
    rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)
      ? (rawPayload as Record<string, unknown>)
      : null;

  try {
    const result = await insertPilotEvent({
      orgId,
      userId,
      eventName,
      payload,
    });
    return NextResponse.json({ ok: true, persisted: result.ok });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo guardar." }, { status: 500 });
  }
}
