import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  createAccessResolver,
  updateOrgTraceLotEudr,
} from "@/infrastructure/container";

function statusForReason(reason: string): number {
  switch (reason) {
    case "unauthenticated":
      return 401;
    case "inactive_member":
    case "missing_traceability_entitlement":
    case "no_org":
      return 403;
    case "not_found":
      return 404;
    default:
      return 400;
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ lotId: string }> },
) {
  const { lotId } = await context.params;
  const { userId, orgId } = await auth();
  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);

  let body: {
    producerName?: string;
    countryOfProduction?: string;
    productionEndDate?: string | null;
    deforestationFreeDeclared?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      {
        status: "TRACE_MUTATION_DENIED",
        reason: "invalid_input",
        message: "Invalid JSON body",
      },
      { status: 400 },
    );
  }

  const result = await updateOrgTraceLotEudr.execute({
    authority,
    orgId: orgId ?? null,
    lotId,
    producerName: body.producerName,
    countryOfProduction: body.countryOfProduction,
    productionEndDate: body.productionEndDate,
    deforestationFreeDeclared: body.deforestationFreeDeclared,
  });

  if (!result.ok) {
    const denied =
      result.reason === "missing_traceability_entitlement" ||
      result.reason === "unauthenticated" ||
      result.reason === "inactive_member" ||
      result.reason === "no_org";
    return NextResponse.json(
      {
        status: denied ? "TRACE_UNAVAILABLE" : "TRACE_MUTATION_DENIED",
        reason: result.reason,
        message: result.message,
      },
      { status: statusForReason(result.reason) },
    );
  }

  return NextResponse.json({ status: "OK", data: result.data });
}
