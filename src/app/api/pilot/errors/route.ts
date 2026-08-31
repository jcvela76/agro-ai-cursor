import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { insertPilotError } from "@/infrastructure/pilot/neon-pilot-telemetry";

export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  // Allow authenticated users without org for client crashes during org switch — still log.
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Auth requerida." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const payload = typeof body === "object" && body !== null ? body : {};
  const source =
    "source" in payload && typeof (payload as { source: unknown }).source === "string"
      ? (payload as { source: string }).source
      : "client";
  const message =
    "message" in payload && typeof (payload as { message: unknown }).message === "string"
      ? (payload as { message: string }).message
      : "";
  if (!message.trim()) {
    return NextResponse.json({ ok: false, error: "message requerido." }, { status: 400 });
  }

  const stack =
    "stack" in payload && typeof (payload as { stack: unknown }).stack === "string"
      ? (payload as { stack: string }).stack
      : null;
  const route =
    "route" in payload && typeof (payload as { route: unknown }).route === "string"
      ? (payload as { route: string }).route
      : null;
  const severityRaw =
    "severity" in payload && typeof (payload as { severity: unknown }).severity === "string"
      ? (payload as { severity: string }).severity
      : "error";
  const severity =
    severityRaw === "info" || severityRaw === "warn" || severityRaw === "error"
      ? severityRaw
      : "error";

  try {
    const result = await insertPilotError({
      orgId: orgId ?? null,
      userId,
      source,
      message,
      stack,
      route,
      userAgent: request.headers.get("user-agent"),
      severity,
    });
    return NextResponse.json({ ok: true, persisted: result.ok });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo guardar." }, { status: 500 });
  }
}
