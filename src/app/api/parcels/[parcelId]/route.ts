import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  createAccessResolver,
  deleteOrgParcel,
  updateOrgParcel,
} from "@/infrastructure/container";

function mutationStatus(reason: string): number {
  switch (reason) {
    case "unauthenticated":
      return 401;
    case "not_found":
      return 404;
    case "cross_org":
    case "inactive_member":
      return 403;
    default:
      return 400;
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ parcelId: string }> },
) {
  const { userId, orgId } = await auth();
  const { parcelId } = await context.params;
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

  const result = await updateOrgParcel.execute({
    authority,
    orgId: orgId ?? null,
    parcelId,
    name: body.name,
    geometry: body.geometry,
    timezone: body.timezone,
  });

  if (!result.ok) {
    return NextResponse.json(
      { status: "PARCEL_MUTATION_DENIED", reason: result.reason, message: result.message },
      { status: mutationStatus(result.reason) },
    );
  }

  return NextResponse.json({ status: "OK", data: result.data });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ parcelId: string }> },
) {
  const { userId, orgId } = await auth();
  const { parcelId } = await context.params;
  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);

  const result = await deleteOrgParcel.execute({
    authority,
    orgId: orgId ?? null,
    parcelId,
  });

  if (!result.ok) {
    return NextResponse.json(
      { status: "PARCEL_MUTATION_DENIED", reason: result.reason, message: result.message },
      { status: mutationStatus(result.reason) },
    );
  }

  return NextResponse.json({ status: "OK" });
}
