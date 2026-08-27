import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createAccessResolver, listOrgParcels } from "@/infrastructure/container";

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

  return NextResponse.json({ status: "OK", data: result.data });
}
