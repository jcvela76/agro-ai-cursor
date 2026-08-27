import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  createAccessResolver,
  createOrgTraceLot,
  listOrgTraceLots,
} from "@/infrastructure/container";

function statusForReason(reason: string): number {
  switch (reason) {
    case "unauthenticated":
      return 401;
    case "inactive_member":
    case "missing_traceability_entitlement":
    case "no_org":
    case "cross_org_parcel":
      return 403;
    case "not_found":
      return 404;
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

export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);

  let body: {
    name?: string;
    harvestSeason?: string;
    cropType?: string;
    parcelId?: string | null;
    countryOfProduction?: string;
    producerName?: string;
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

  const result = await createOrgTraceLot.execute({
    authority,
    orgId: orgId ?? null,
    name: body.name ?? "",
    harvestSeason: body.harvestSeason ?? "",
    cropType: body.cropType,
    parcelId: body.parcelId,
    countryOfProduction: body.countryOfProduction,
    producerName: body.producerName ?? "",
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

  return NextResponse.json({ status: "OK", data: result.data }, { status: 201 });
}
