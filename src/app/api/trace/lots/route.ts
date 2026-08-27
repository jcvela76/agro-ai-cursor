import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createAccessResolver, listOrgTraceLots } from "@/infrastructure/container";

function statusForReason(reason: string): number {
  switch (reason) {
    case "unauthenticated":
      return 401;
    case "inactive_member":
    case "missing_traceability_entitlement":
    case "no_org":
      return 403;
    default:
      return 400;
  }
}

export async function GET() {
  const { userId, orgId } = await auth();
  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);

  const result = await listOrgTraceLots.execute({
    authority,
    orgId: orgId ?? null,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        status: "TRACE_UNAVAILABLE",
        reason: result.reason,
        message: result.message,
      },
      { status: statusForReason(result.reason) },
    );
  }

  return NextResponse.json({ status: "OK", data: result.data });
}
