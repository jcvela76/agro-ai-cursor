import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createAccessResolver, getOrgReport } from "@/infrastructure/container";

export async function GET(
  _request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await context.params;
  const { userId, orgId } = await auth();
  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);

  if (!authority) {
    return NextResponse.json(
      { status: "REPORT_UNAVAILABLE", message: "Autenticación requerida." },
      { status: 401 },
    );
  }

  const result = await getOrgReport.execute(authority.orgId, reportId);
  if (!result.ok) {
    return NextResponse.json(
      { status: "REPORT_UNAVAILABLE", message: "Informe no encontrado." },
      { status: 404 },
    );
  }

  const pdf = Buffer.from(result.report.pdfBase64, "base64");
  const filename = `${result.report.title.replace(/\s+/g, "-").toLowerCase()}.pdf`;

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
