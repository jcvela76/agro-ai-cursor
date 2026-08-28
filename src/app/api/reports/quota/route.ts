import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createAccessResolver, getReportQuota } from "@/infrastructure/container";

export async function GET() {
  const { userId, orgId } = await auth();
  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);

  if (!authority) {
    return NextResponse.json(
      { status: "REPORT_UNAVAILABLE", message: "Autenticación requerida." },
      { status: 401 },
    );
  }

  const quota = await getReportQuota.execute(authority);
  return NextResponse.json({ status: "OK", data: quota });
}
