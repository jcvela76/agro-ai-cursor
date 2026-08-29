import {
  displayCropLabel,
  gddBaseForCropKey,
  isCropKey,
  parseCropKey,
  type CropKey,
} from "@/domain/parcel/crop-catalog";
import { currentReportDayKey } from "@/domain/billing/plan-limits";

export interface ParcelAgronomicProfile {
  parcelId: string;
  orgId: string;
  /** Catalog key (PE pilot). Null = unknown. */
  cropKey: CropKey | null;
  /** Display / free-text (required when cropKey is `otro`). */
  crop: string | null;
  /** ISO date YYYY-MM-DD when known. */
  sowingDate: string | null;
  phenologyStage: string | null;
  irrigationSystem: string | null;
  irrigationFrequency: string | null;
  lastApplication: string | null;
  expectedHarvest: string | null;
  notes: string | null;
  /** Optional override for GDD base (°C). Null = use crop catalog default. */
  gddBaseCelsius: number | null;
  updatedAt: string;
  updatedByUserId: string | null;
}

/** Partial update: omit = leave unchanged; null = clear field. */
export interface UpdateParcelAgronomicProfileFields {
  cropKey?: CropKey | null;
  crop?: string | null;
  sowingDate?: string | null;
  phenologyStage?: string | null;
  irrigationSystem?: string | null;
  irrigationFrequency?: string | null;
  lastApplication?: string | null;
  expectedHarvest?: string | null;
  notes?: string | null;
  gddBaseCelsius?: number | null;
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
    cropKey: null,
    crop: null,
    sowingDate: null,
    phenologyStage: null,
    irrigationSystem: null,
    irrigationFrequency: null,
    lastApplication: null,
    expectedHarvest: null,
    notes: null,
    gddBaseCelsius: null,
    updatedAt: new Date(0).toISOString(),
    updatedByUserId: null,
  };
}

const PROFILE_TEXT_KEYS = [
  "crop",
  "sowingDate",
  "phenologyStage",
  "irrigationSystem",
  "irrigationFrequency",
  "lastApplication",
  "expectedHarvest",
  "notes",
] as const;

export type ProfileFieldKey =
  | (typeof PROFILE_TEXT_KEYS)[number]
  | "cropKey"
  | "gddBaseCelsius";

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

/** Accept YYYY-MM-DD only; reject free text for campaign math. */
export function normalizeSowingDate(value: unknown): string | null | undefined {
  const text = normalizeProfileText(value);
  if (text === undefined || text === null) {
    return text;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return undefined;
  }
  const [y, m, d] = text.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return undefined;
  }
  return text;
}

export function normalizeGddBaseCelsius(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 20) {
    return undefined;
  }
  return Math.round(n * 10) / 10;
}

export function parseProfileFields(raw: unknown): UpdateParcelAgronomicProfileFields {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const obj = raw as Record<string, unknown>;
  const out: UpdateParcelAgronomicProfileFields = {};

  if ("cropKey" in obj) {
    const parsed = parseCropKey(obj.cropKey);
    if (parsed !== undefined) {
      out.cropKey = parsed;
    } else if (typeof obj.cropKey === "string" && isCropKey(obj.cropKey.trim().toLowerCase())) {
      out.cropKey = obj.cropKey.trim().toLowerCase() as CropKey;
    }
  }

  for (const key of PROFILE_TEXT_KEYS) {
    if (!(key in obj)) continue;
    if (key === "sowingDate") {
      const sowing = normalizeSowingDate(obj[key]);
      if (sowing !== undefined) {
        out.sowingDate = sowing;
      }
      continue;
    }
    const normalized = normalizeProfileText(obj[key]);
    if (normalized !== undefined) {
      out[key] = normalized;
    }
  }

  if ("gddBaseCelsius" in obj) {
    const base = normalizeGddBaseCelsius(obj.gddBaseCelsius);
    if (base !== undefined) {
      out.gddBaseCelsius = base;
    }
  }

  // If agent only sends crop text matching catalog, infer cropKey.
  if (out.cropKey === undefined && out.crop) {
    const inferred = parseCropKey(out.crop);
    if (inferred) {
      out.cropKey = inferred;
      if (inferred !== "otro") {
        out.crop = displayCropLabel(inferred, out.crop);
      }
    }
  }

  return out;
}

export function mergeProfileFields(
  current: ParcelAgronomicProfile,
  fields: UpdateParcelAgronomicProfileFields,
): Omit<ParcelAgronomicProfile, "updatedAt" | "updatedByUserId"> {
  const cropKey = fields.cropKey !== undefined ? fields.cropKey : current.cropKey;
  let crop = fields.crop !== undefined ? fields.crop : current.crop;
  if (cropKey && cropKey !== "otro" && fields.cropKey !== undefined && fields.crop === undefined) {
    crop = displayCropLabel(cropKey, crop);
  }

  return {
    parcelId: current.parcelId,
    orgId: current.orgId,
    cropKey,
    crop,
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
    gddBaseCelsius:
      fields.gddBaseCelsius !== undefined ? fields.gddBaseCelsius : current.gddBaseCelsius,
  };
}

/** Prioritized gaps for agent prompting (one per turn). */
export function profileGaps(profile: ParcelAgronomicProfile): string[] {
  const gaps: string[] = [];
  if (!profile.cropKey && !profile.crop) gaps.push("crop");
  if (!profile.sowingDate) gaps.push("sowing_date");
  if (!profile.irrigationSystem) gaps.push("irrigation_system");
  if (!profile.irrigationFrequency) gaps.push("irrigation_frequency");
  if (!profile.phenologyStage) gaps.push("phenology_stage");
  return gaps;
}

/** @deprecated use profileGaps */
export function profileHasGaps(profile: ParcelAgronomicProfile): string[] {
  return profileGaps(profile);
}

export type CampaignSource = "sowing" | "calendar_ytd";

export interface CampaignWindow {
  startDate: string;
  endDate: string;
  source: CampaignSource;
}

export function resolveCampaignWindow(
  profile: Pick<ParcelAgronomicProfile, "sowingDate">,
  now = new Date(),
): CampaignWindow {
  const endDate = currentReportDayKey(now);
  if (profile.sowingDate && /^\d{4}-\d{2}-\d{2}$/.test(profile.sowingDate)) {
    if (profile.sowingDate <= endDate) {
      return {
        startDate: profile.sowingDate,
        endDate,
        source: "sowing",
      };
    }
  }
  const year = endDate.slice(0, 4);
  return {
    startDate: `${year}-01-01`,
    endDate,
    source: "calendar_ytd",
  };
}

export function resolveGddBaseCelsius(
  profile: Pick<ParcelAgronomicProfile, "cropKey" | "gddBaseCelsius">,
): number {
  if (typeof profile.gddBaseCelsius === "number") {
    return profile.gddBaseCelsius;
  }
  return gddBaseForCropKey(profile.cropKey);
}

export function buildParcelProfileContextBlock(profile: ParcelAgronomicProfile): string {
  const gaps = profileGaps(profile);
  const cropLabel = displayCropLabel(profile.cropKey, profile.crop) ?? "desconocido";
  const lines = [
    "## Contexto de parcela (persistido)",
    `- cultivo: ${cropLabel}${profile.cropKey ? ` (key=${profile.cropKey})` : ""}`,
    `- siembra: ${profile.sowingDate ?? "desconocida"}`,
    `- fenología: ${profile.phenologyStage ?? "desconocida"}`,
    `- riego: ${profile.irrigationSystem ?? "desconocido"} / ${profile.irrigationFrequency ?? "frecuencia desconocida"}`,
    `- GDD base: ${resolveGddBaseCelsius(profile)} °C${profile.gddBaseCelsius != null ? " (override)" : " (catálogo)"}`,
    `- campaña: ${resolveCampaignWindow(profile).source} (${resolveCampaignWindow(profile).startDate} → ${resolveCampaignWindow(profile).endDate})`,
    `- gaps prioritarios: ${gaps.length > 0 ? gaps.join(", ") : "(ninguno)"}`,
    "",
    "Reglas de gaps:",
    "- Si el usuario aporta un gap, llama `updateParcelProfile` de inmediato (sin «¿lo guardo?»).",
    "- Si falta evidencia de tools o hay gaps y la pregunta es operativa, pregunta **UN solo** gap (el primero de la lista) al final del resumen.",
    "- Si una tool falla o no hay datos, dilo, no inventes, y propone completar perfil o reintentar.",
  ];
  return lines.join("\n");
}
