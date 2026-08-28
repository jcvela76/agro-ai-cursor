import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createAccessResolver, getReportQuota } from "@/infrastructure/container";

export async function GET(request: Request) {
  const { userId, orgId } = await auth();
  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);

  if (!authority) {
    return NextResponse.json(
      { status: "REPORT_UNAVAILABLE", message: "Autenticación requerida." },
      { status: 401 },
    );
  }

  const parcelId = new URL(request.url).searchParams.get("parcelId") ?? undefined;
  const quota = await getReportQuota.execute(authority, { parcelId });
  return NextResponse.json({ status: "OK", data: quota });
}
