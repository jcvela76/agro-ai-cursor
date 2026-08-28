import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { ReportType } from "@/domain/report/types";
import { createAccessResolver, generateOrgReport } from "@/infrastructure/container";

export const maxDuration = 60;

const REPORT_TYPES = new Set<ReportType>([
  "weather_climate",
  "water_balance",
  "agent_briefing",
  "trace_lot_dossier",
]);

export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);

  if (!authority) {
    return NextResponse.json(
      { status: "REPORT_UNAVAILABLE", message: "Autenticación requerida." },
      { status: 401 },
    );
  }

  let body: {
    reportType?: string;
    parcelId?: string;
    lotId?: string;
    agentQuestion?: string;
    agentAnswerMarkdown?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { status: "REPORT_UNAVAILABLE", message: "JSON inválido." },
      { status: 400 },
    );
  }

  if (!body.reportType || !REPORT_TYPES.has(body.reportType as ReportType)) {
    return NextResponse.json(
      { status: "REPORT_UNAVAILABLE", message: "reportType inválido." },
      { status: 400 },
    );
  }

  const result = await generateOrgReport.execute({
    authority,
    reportType: body.reportType as ReportType,
    parcelId: body.parcelId,
    lotId: body.lotId,
    agentQuestion: body.agentQuestion,
    agentAnswerMarkdown: body.agentAnswerMarkdown,
  });

  if (!result.ok) {
    const status =
      result.reason === "missing_plus_entitlement"
        ? 403
        : result.reason === "quota_exceeded"
          ? 429
          : 400;
    return NextResponse.json(
      {
        status: "REPORT_UNAVAILABLE",
        reason: result.reason,
        message: result.message,
        quota: "quota" in result ? result.quota : undefined,
      },
      { status },
    );
  }

  return NextResponse.json({
    status: "OK",
    data: {
      id: result.report.id,
      title: result.report.title,
      reportType: result.report.reportType,
      previewUrl: `/reports/${result.report.id}`,
      pdfUrl: `/api/reports/${result.report.id}/pdf`,
      quota: result.quota,
    },
  });
}
