import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  appendParcelFieldNote,
  createAccessResolver,
  listParcelFieldNotes,
} from "@/infrastructure/container";

export async function GET(
  _request: Request,
  context: { params: Promise<{ parcelId: string }> },
) {
  const { userId, orgId } = await auth();
  const { parcelId } = await context.params;
  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);

  const result = await listParcelFieldNotes.execute({ authority, parcelId });
  if (!result.ok) {
    return NextResponse.json(
      { status: "FIELD_NOTES_UNAVAILABLE", message: result.message },
      { status: 403 },
    );
  }

  return NextResponse.json({ status: "OK", data: result.data });
}

export async function POST(
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
      { status: "BAD_REQUEST", message: "JSON inválido." },
      { status: 400 },
    );
  }

  const payload = (body ?? {}) as {
    body?: unknown;
    zoneLabel?: unknown;
    observedAt?: unknown;
  };

  const result = await appendParcelFieldNote.execute({
    authority,
    parcelId,
    body: payload.body,
    zoneLabel: payload.zoneLabel,
    observedAt: payload.observedAt,
  });

  if (!result.ok) {
    const status =
      result.message.includes("obligatorio") || result.message.includes("inválid")
        ? 400
        : 403;
    return NextResponse.json(
      {
        status: status === 400 ? "BAD_REQUEST" : "FIELD_NOTES_UNAVAILABLE",
        message: result.message,
      },
      { status },
    );
  }

  return NextResponse.json({ status: "OK", data: result.data }, { status: 201 });
}
