import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  PILOT_BUG_FLOWS,
  PILOT_FEEDBACK_KINDS,
  type PilotFeedbackKind,
} from "@/content/pilot/checklist";
import { requireOrgAdmin } from "@/lib/require-org-admin";
import {
  insertPilotFeedback,
  listPilotFeedback,
} from "@/infrastructure/pilot/neon-pilot-telemetry";

const KINDS = new Set(PILOT_FEEDBACK_KINDS.map((k) => k.id));
const FLOWS = new Set(PILOT_BUG_FLOWS);

export async function GET(request: Request) {
  const gate = await requireOrgAdmin();
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.message }, { status: gate.status });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "40");

  try {
    const rows = await listPilotFeedback({ orgId: gate.orgId, limit });
    return NextResponse.json({
      ok: true,
      data: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo listar." }, { status: 500 });
  }
}

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

  const payload = typeof body === "object" && body !== null ? body : {};
  const kindRaw = "kind" in payload ? String((payload as { kind: unknown }).kind) : "";
  if (!KINDS.has(kindRaw as PilotFeedbackKind)) {
    return NextResponse.json({ ok: false, error: "kind inválido." }, { status: 400 });
  }
  const text =
    "body" in payload && typeof (payload as { body: unknown }).body === "string"
      ? (payload as { body: string }).body.trim()
      : "";
  if (text.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Escribe al menos unas líneas de detalle." },
      { status: 400 },
    );
  }

  const rating =
    "rating" in payload && typeof (payload as { rating: unknown }).rating === "string"
      ? (payload as { rating: string }).rating
      : null;
  const flowRaw =
    "flow" in payload && typeof (payload as { flow: unknown }).flow === "string"
      ? (payload as { flow: string }).flow
      : null;
  const flow = flowRaw && FLOWS.has(flowRaw as (typeof PILOT_BUG_FLOWS)[number]) ? flowRaw : null;

  const meta: Record<string, unknown> = {};
  for (const key of ["role", "region", "crop", "hectares"] as const) {
    if (key in payload && typeof (payload as Record<string, unknown>)[key] === "string") {
      const value = String((payload as Record<string, unknown>)[key]).trim();
      if (value) {
        meta[key] = value.slice(0, 80);
      }
    }
  }

  try {
    const result = await insertPilotFeedback({
      orgId,
      userId,
      kind: kindRaw,
      body: text,
      rating,
      flow,
      meta: Object.keys(meta).length ? meta : null,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: "No se pudo guardar." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, persisted: true });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo guardar." }, { status: 500 });
  }
}
