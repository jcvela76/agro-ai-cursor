export const FIELD_NOTE_BODY_MAX = 2000;
export const FIELD_NOTE_ZONE_MAX = 80;
export const FIELD_NOTE_LIST_MAX = 50;
export const FIELD_NOTE_PHOTO_MAX_BYTES = 4 * 1024 * 1024;
export const FIELD_NOTE_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type FieldNotePhotoContentType = (typeof FIELD_NOTE_PHOTO_TYPES)[number];

export interface ParcelFieldNote {
  id: string;
  orgId: string;
  parcelId: string;
  body: string;
  zoneLabel: string | null;
  observedAt: string;
  authorUserId: string;
  createdAt: string;
  photoUrl: string | null;
  photoContentType: string | null;
}

export interface AppendParcelFieldNoteInput {
  orgId: string;
  parcelId: string;
  body: string;
  zoneLabel?: string | null;
  observedAt?: Date;
  authorUserId: string;
  photoUrl?: string | null;
  photoContentType?: string | null;
}

export interface ParcelFieldNoteRegistry {
  listByParcel(input: {
    orgId: string;
    parcelId: string;
    limit?: number;
  }): Promise<ParcelFieldNote[]>;

  append(input: AppendParcelFieldNoteInput): Promise<ParcelFieldNote>;
}

export function normalizeFieldNoteBody(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, FIELD_NOTE_BODY_MAX);
}

export function normalizeFieldNoteZoneLabel(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, FIELD_NOTE_ZONE_MAX);
}

export function parseObservedAt(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string") return undefined;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return undefined;
  return dt;
}

export function isAllowedFieldNotePhotoType(
  value: string,
): value is FieldNotePhotoContentType {
  return (FIELD_NOTE_PHOTO_TYPES as readonly string[]).includes(value);
}
