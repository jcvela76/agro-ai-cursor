/**
 * Peru pilot crop catalog — GDD bases and mid-season Kc (FAO-56 style, orientative).
 * Values are pilot defaults, not variety-specific prescriptions.
 */

export const CROP_KEYS = [
  "cafe",
  "uva",
  "esparrago",
  "palto",
  "maiz",
  "papa",
  "citricos",
  "otro",
] as const;

export type CropKey = (typeof CROP_KEYS)[number];

export const CROP_LABELS: Record<CropKey, string> = {
  cafe: "Café",
  uva: "Uva",
  esparrago: "Espárrago",
  palto: "Palto / aguacate",
  maiz: "Maíz",
  papa: "Papa",
  citricos: "Cítricos",
  otro: "Otro",
};

/** Default GDD base temperature (°C) per crop — pilot. */
export const CROP_GDD_BASE: Record<CropKey, number> = {
  cafe: 10,
  uva: 10,
  esparrago: 5,
  palto: 10,
  maiz: 10,
  papa: 5,
  citricos: 10,
  otro: 10,
};

export type KcStage = "initial" | "mid" | "late";

/** Orientative single-crop Kc by coarse stage (FAO-56 tables, simplified). */
export const CROP_KC: Record<CropKey, Record<KcStage, number>> = {
  cafe: { initial: 0.9, mid: 0.95, late: 0.9 },
  uva: { initial: 0.3, mid: 0.7, late: 0.45 },
  esparrago: { initial: 0.5, mid: 1.0, late: 0.3 },
  palto: { initial: 0.6, mid: 0.85, late: 0.75 },
  maiz: { initial: 0.3, mid: 1.2, late: 0.6 },
  papa: { initial: 0.5, mid: 1.15, late: 0.75 },
  citricos: { initial: 0.7, mid: 0.7, late: 0.7 },
  otro: { initial: 0.7, mid: 1.0, late: 0.7 },
};

export function isCropKey(value: unknown): value is CropKey {
  return typeof value === "string" && (CROP_KEYS as readonly string[]).includes(value);
}

export function parseCropKey(value: unknown): CropKey | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (isCropKey(normalized)) return normalized;
  // Accept common aliases from agent free text
  const aliases: Record<string, CropKey> = {
    coffee: "cafe",
    café: "cafe",
    grape: "uva",
    vid: "uva",
    asparagus: "esparrago",
    avocado: "palto",
    aguacate: "palto",
    corn: "maiz",
    maize: "maiz",
    potato: "papa",
    citrus: "citricos",
    naranja: "citricos",
    limon: "citricos",
    limón: "citricos",
    other: "otro",
  };
  return aliases[normalized] ?? undefined;
}

export function gddBaseForCropKey(cropKey: CropKey | null | undefined): number {
  if (!cropKey) return CROP_GDD_BASE.otro;
  return CROP_GDD_BASE[cropKey];
}

export function inferKcStage(phenologyStage: string | null | undefined): KcStage {
  if (!phenologyStage) return "mid";
  const t = phenologyStage.toLowerCase();
  if (
    /inicial|siembra|emergencia|establec|plantaci|brote|yema|dorman/.test(t)
  ) {
    return "initial";
  }
  if (/cosecha|senesc|madur|post|final|fin de|caída|caida/.test(t)) {
    return "late";
  }
  return "mid";
}

export function kcForCrop(
  cropKey: CropKey | null | undefined,
  phenologyStage: string | null | undefined,
): { kc: number; stage: KcStage } | null {
  if (!cropKey) return null;
  const stage = inferKcStage(phenologyStage);
  return { kc: CROP_KC[cropKey][stage], stage };
}

export function displayCropLabel(
  cropKey: CropKey | null | undefined,
  crop: string | null | undefined,
): string | null {
  if (cropKey && cropKey !== "otro") {
    return CROP_LABELS[cropKey];
  }
  if (crop?.trim()) return crop.trim();
  if (cropKey === "otro") return CROP_LABELS.otro;
  return null;
}
