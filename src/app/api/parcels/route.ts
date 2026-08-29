import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { resolveParcelQuota } from "@/application/parcel/mutate-org-parcels";
import {
  createAccessResolver,
  createOrgParcel,
  listOrgParcels,
  orgMetadataStore,
  parcelRegistry,
} from "@/infrastructure/container";

function mutationStatus(reason: string): number {
  switch (reason) {
    case "unauthenticated":
      return 401;
    case "not_found":
      return 404;
    case "cross_org":
    case "inactive_member":
    case "parcel_limit":
    case "parcel_area_limit":
      return 403;
    default:
      return 400;
  }
}

export async function GET() {
  const { userId, orgId } = await auth();
  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);

  const result = await listOrgParcels.execute({
    authority,
    orgId: orgId ?? null,
  });

  if (!result.ok) {
    const status = result.reason === "unauthenticated" ? 401 : 400;
    return NextResponse.json(
      { status: "PARCEL_LIST_DENIED", reason: result.reason, message: result.message },
      { status },
    );
  }

  let quota = null;
  if (authority && orgId) {
    quota = await resolveParcelQuota({
      parcels: parcelRegistry,
      metadata: orgMetadataStore,
      authority,
      orgId,
    });
  }

  return NextResponse.json({ status: "OK", data: result.data, quota });
}

export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);

  let body: { name?: string; geometry?: unknown; timezone?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { status: "PARCEL_MUTATION_DENIED", reason: "invalid_geometry", message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const result = await createOrgParcel.execute({
    authority,
    orgId: orgId ?? null,
    name: body.name ?? "",
    geometry: body.geometry,
    timezone: body.timezone,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        status: "PARCEL_MUTATION_DENIED",
        reason: result.reason,
        message: result.message,
        billingHref:
          result.reason === "parcel_limit" || result.reason === "parcel_area_limit"
            ? "/app/billing"
            : undefined,
      },
      { status: mutationStatus(result.reason) },
    );
  }

  return NextResponse.json({ status: "OK", data: result.data }, { status: 201 });
}
