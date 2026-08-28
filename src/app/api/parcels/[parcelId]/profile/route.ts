import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { parseProfileFields } from "@/domain/parcel/agronomic-profile";
import {
  createAccessResolver,
  getParcelAgronomicProfile,
  updateParcelAgronomicProfile,
} from "@/infrastructure/container";

export async function GET(
  _request: Request,
  context: { params: Promise<{ parcelId: string }> },
) {
  const { userId, orgId } = await auth();
  const { parcelId } = await context.params;
  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);

  const result = await getParcelAgronomicProfile.execute({ authority, parcelId });
  if (!result.ok) {
    return NextResponse.json(
      { status: "PROFILE_UNAVAILABLE", message: result.message },
      { status: 403 },
    );
  }

  return NextResponse.json({ status: "OK", data: result.data });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ parcelId: string }> },
) {
  const { userId, orgId } = await auth();
  const { parcelId } = await context.params;
  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "PROFILE_UNAVAILABLE", message: "JSON inválido." },
      { status: 400 },
    );
  }

  const fields = parseProfileFields(body);
  const result = await updateParcelAgronomicProfile.execute({
    authority,
    parcelId,
    fields,
  });

  if (!result.ok) {
    return NextResponse.json(
      { status: "PROFILE_UNAVAILABLE", message: result.message },
      { status: 403 },
    );
  }

  return NextResponse.json({ status: "OK", data: result.data });
}
