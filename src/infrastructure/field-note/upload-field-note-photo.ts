import { put } from "@vercel/blob";
import {
  FIELD_NOTE_PHOTO_MAX_BYTES,
  isAllowedFieldNotePhotoType,
  type FieldNotePhotoContentType,
} from "@/domain/field-note/types";

export type FieldNotePhotoPut = typeof put;

export interface UploadedFieldNotePhoto {
  url: string;
  contentType: FieldNotePhotoContentType;
}

export type UploadFieldNotePhotoResult =
  | { ok: true; data: UploadedFieldNotePhoto }
  | { ok: false; message: string };

function extensionFor(contentType: FieldNotePhotoContentType): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

export async function uploadFieldNotePhoto(input: {
  orgId: string;
  parcelId: string;
  file: File;
  putFn?: FieldNotePhotoPut;
}): Promise<UploadFieldNotePhotoResult> {
  const contentType = input.file.type || "application/octet-stream";
  if (!isAllowedFieldNotePhotoType(contentType)) {
    return {
      ok: false,
      message: "Foto: usa JPEG, PNG o WebP.",
    };
  }
  if (input.file.size <= 0) {
    return { ok: false, message: "Foto vacía." };
  }
  if (input.file.size > FIELD_NOTE_PHOTO_MAX_BYTES) {
    return {
      ok: false,
      message: "Foto demasiado grande (máx. 4 MB).",
    };
  }
  if (!input.putFn && !process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      ok: false,
      message: "Almacenamiento de fotos no configurado (BLOB_READ_WRITE_TOKEN).",
    };
  }

  const pathname = `field-notes/${input.orgId}/${input.parcelId}/${Date.now()}.${extensionFor(contentType)}`;
  const putFn = input.putFn ?? put;

  try {
    const blob = await putFn(pathname, input.file, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });
    return {
      ok: true,
      data: { url: blob.url, contentType },
    };
  } catch {
    return {
      ok: false,
      message: "No se pudo subir la foto.",
    };
  }
}
