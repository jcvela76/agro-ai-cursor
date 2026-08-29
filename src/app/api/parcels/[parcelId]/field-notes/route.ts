import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  appendParcelFieldNote,
  createAccessResolver,
  listParcelFieldNotes,
} from "@/infrastructure/container";
import { uploadFieldNotePhoto } from "@/infrastructure/field-note/upload-field-note-photo";

export const runtime = "nodejs";

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

  const contentType = request.headers.get("content-type") ?? "";
  let noteBody: unknown;
  let zoneLabel: unknown;
  let observedAt: unknown;
  let photo: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { status: "BAD_REQUEST", message: "Formulario inválido." },
        { status: 400 },
      );
    }
    noteBody = form.get("body");
    zoneLabel = form.get("zoneLabel");
    observedAt = form.get("observedAt");
    const file = form.get("photo");
    if (file instanceof File && file.size > 0) {
      photo = file;
    }
  } else {
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
    noteBody = payload.body;
    zoneLabel = payload.zoneLabel;
    observedAt = payload.observedAt;
  }

  let photoUrl: string | null = null;
  let photoContentType: string | null = null;

  if (photo) {
    const gate = await listParcelFieldNotes.execute({
      authority,
      parcelId,
      limit: 1,
    });
    if (!gate.ok) {
      return NextResponse.json(
        { status: "FIELD_NOTES_UNAVAILABLE", message: gate.message },
        { status: 403 },
      );
    }
    if (!authority?.orgId) {
      return NextResponse.json(
        { status: "FIELD_NOTES_UNAVAILABLE", message: "Organización requerida." },
        { status: 403 },
      );
    }
    const uploaded = await uploadFieldNotePhoto({
      orgId: authority.orgId,
      parcelId,
      file: photo,
    });
    if (!uploaded.ok) {
      return NextResponse.json(
        { status: "BAD_REQUEST", message: uploaded.message },
        { status: 400 },
      );
    }
    photoUrl = uploaded.data.url;
    photoContentType = uploaded.data.contentType;
  }

  const result = await appendParcelFieldNote.execute({
    authority,
    parcelId,
    body: noteBody,
    zoneLabel,
    observedAt,
    photoUrl,
    photoContentType,
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
