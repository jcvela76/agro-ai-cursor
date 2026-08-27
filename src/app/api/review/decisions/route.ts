import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  appendOrgReviewDecision,
  createAccessResolver,
  listOrgReviewDecisions,
} from "@/infrastructure/container";

function statusForReason(reason: string): number {
  switch (reason) {
    case "unauthenticated":
      return 401;
    case "inactive_member":
    case "missing_agronomic_review_entitlement":
    case "no_org":
    case "cross_org_parcel":
      return 403;
    default:
      return 400;
  }
}

export async function GET(request: Request) {
  const { userId, orgId } = await auth();
  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);
  const parcelId = new URL(request.url).searchParams.get("parcelId");

  const result = await listOrgReviewDecisions.execute({
    authority,
    orgId: orgId ?? null,
    parcelId,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        status: "REVIEW_UNAVAILABLE",
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
    parcelId?: string;
    kind?: string;
    summary?: string;
    rationale?: string;
    decidedAt?: string | null;
    evidenceRef?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      {
        status: "REVIEW_MUTATION_DENIED",
        reason: "invalid_input",
        message: "Invalid JSON body",
      },
      { status: 400 },
    );
  }

  if (!userId) {
    return NextResponse.json(
      {
        status: "REVIEW_UNAVAILABLE",
        reason: "unauthenticated",
        message: "Agronomic Review data is not available for this request.",
      },
      { status: 401 },
    );
  }

  const result = await appendOrgReviewDecision.execute({
    authority,
    orgId: orgId ?? null,
    parcelId: body.parcelId ?? "",
    kind: body.kind,
    summary: body.summary ?? "",
    rationale: body.rationale ?? "",
    actorId: userId,
    decidedAt: body.decidedAt,
    evidenceRef: body.evidenceRef,
  });

  if (!result.ok) {
    const denied =
      result.reason === "missing_agronomic_review_entitlement" ||
      result.reason === "unauthenticated" ||
      result.reason === "inactive_member" ||
      result.reason === "no_org";
    return NextResponse.json(
      {
        status: denied ? "REVIEW_UNAVAILABLE" : "REVIEW_MUTATION_DENIED",
        reason: result.reason,
        message: result.message,
      },
      { status: statusForReason(result.reason) },
    );
  }

  return NextResponse.json({ status: "OK", data: result.data }, { status: 201 });
}
