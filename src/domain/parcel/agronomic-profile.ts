export interface ParcelAgronomicProfile {
  parcelId: string;
  orgId: string;
  crop: string | null;
  sowingDate: string | null;
  phenologyStage: string | null;
  irrigationSystem: string | null;
  irrigationFrequency: string | null;
  lastApplication: string | null;
  expectedHarvest: string | null;
  notes: string | null;
  updatedAt: string;
  updatedByUserId: string | null;
}

/** Partial update: omit = leave unchanged; null = clear field. */
export interface UpdateParcelAgronomicProfileFields {
  crop?: string | null;
  sowingDate?: string | null;
  phenologyStage?: string | null;
  irrigationSystem?: string | null;
  irrigationFrequency?: string | null;
  lastApplication?: string | null;
  expectedHarvest?: string | null;
  notes?: string | null;
}

export interface UpsertParcelAgronomicProfileInput {
  parcelId: string;
  orgId: string;
  updatedByUserId: string;
  fields: UpdateParcelAgronomicProfileFields;
}

export interface ParcelAgronomicProfileRegistry {
  getByParcelId(orgId: string, parcelId: string): Promise<ParcelAgronomicProfile | null>;
  upsert(input: UpsertParcelAgronomicProfileInput): Promise<ParcelAgronomicProfile>;
}

export function emptyParcelAgronomicProfile(
  orgId: string,
  parcelId: string,
): ParcelAgronomicProfile {
  return {
    parcelId,
    orgId,
    crop: null,
    sowingDate: null,
    phenologyStage: null,
    irrigationSystem: null,
    irrigationFrequency: null,
    lastApplication: null,
    expectedHarvest: null,
    notes: null,
    updatedAt: new Date(0).toISOString(),
    updatedByUserId: null,
  };
}

const PROFILE_FIELD_KEYS = [
  "crop",
  "sowingDate",
  "phenologyStage",
  "irrigationSystem",
  "irrigationFrequency",
  "lastApplication",
  "expectedHarvest",
  "notes",
] as const;

export type ProfileFieldKey = (typeof PROFILE_FIELD_KEYS)[number];

export function normalizeProfileText(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed.slice(0, 500);
}

export function parseProfileFields(raw: unknown): UpdateParcelAgronomicProfileFields {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const obj = raw as Record<string, unknown>;
  const out: UpdateParcelAgronomicProfileFields = {};
  for (const key of PROFILE_FIELD_KEYS) {
    if (!(key in obj)) continue;
    const normalized = normalizeProfileText(obj[key]);
    if (normalized !== undefined) {
      out[key] = normalized;
    }
  }
  return out;
}

export function mergeProfileFields(
  current: ParcelAgronomicProfile,
  fields: UpdateParcelAgronomicProfileFields,
): Omit<ParcelAgronomicProfile, "updatedAt" | "updatedByUserId"> {
  return {
    parcelId: current.parcelId,
    orgId: current.orgId,
    crop: fields.crop !== undefined ? fields.crop : current.crop,
    sowingDate: fields.sowingDate !== undefined ? fields.sowingDate : current.sowingDate,
    phenologyStage:
      fields.phenologyStage !== undefined ? fields.phenologyStage : current.phenologyStage,
    irrigationSystem:
      fields.irrigationSystem !== undefined ? fields.irrigationSystem : current.irrigationSystem,
    irrigationFrequency:
      fields.irrigationFrequency !== undefined
        ? fields.irrigationFrequency
        : current.irrigationFrequency,
    lastApplication:
      fields.lastApplication !== undefined ? fields.lastApplication : current.lastApplication,
    expectedHarvest:
      fields.expectedHarvest !== undefined ? fields.expectedHarvest : current.expectedHarvest,
    notes: fields.notes !== undefined ? fields.notes : current.notes,
  };
}

export function profileHasGaps(profile: ParcelAgronomicProfile): string[] {
  const gaps: string[] = [];
  if (!profile.irrigationFrequency) gaps.push("irrigation_frequency");
  if (!profile.crop) gaps.push("crop");
  if (!profile.sowingDate) gaps.push("sowing_date");
  if (!profile.irrigationSystem) gaps.push("irrigation_system");
  return gaps;
}
