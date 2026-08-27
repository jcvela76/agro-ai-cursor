export const ET0_CALCULATION_METHOD_ID = "et0-hargreaves-samani-calendar-ytd/v1";
export const ET0_CALCULATION_METHOD_LABEL =
  "ET0 Hargreaves–Samani (mm), suma año calendario YTD";

export interface Et0DailyTemps {
  date: string;
  tempMaxCelsius: number;
  tempMinCelsius: number;
}

export interface Et0Accumulation {
  totalEt0Mm: number;
  daysIncluded: number;
  periodStart: string;
  periodEnd: string;
}

/** Solar constant (MJ m⁻² min⁻¹) — FAO-56. */
const GSC = 0.0820;
/** Latent heat of vaporization (MJ kg⁻¹) ≈ converts MJ m⁻² day⁻¹ → mm day⁻¹. */
const LAMBDA = 2.45;

/**
 * Day of year (1–366) from ISO date YYYY-MM-DD (UTC calendar day).
 */
export function dayOfYearFromIsoDate(isoDate: string): number {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));
  const utc = Date.UTC(year, month - 1, day);
  const start = Date.UTC(year, 0, 1);
  return Math.floor((utc - start) / 86_400_000) + 1;
}

/**
 * Extraterrestrial radiation Ra in mm/day equivalent (FAO-56 eq. 21 + λ conversion).
 */
export function extraterrestrialRadiationMm(
  latitudeDegrees: number,
  dayOfYear: number,
): number {
  const phi = (latitudeDegrees * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * dayOfYear) / 365);
  const delta = 0.409 * Math.sin((2 * Math.PI * dayOfYear) / 365 - 1.39);
  const wsArg = -Math.tan(phi) * Math.tan(delta);
  const ws = Math.acos(Math.min(1, Math.max(-1, wsArg)));
  const raMj =
    ((24 * 60) / Math.PI) *
    GSC *
    dr *
    (ws * Math.sin(phi) * Math.sin(delta) +
      Math.cos(phi) * Math.cos(delta) * Math.sin(ws));
  return raMj / LAMBDA;
}

/**
 * Daily reference ET0 (mm) via Hargreaves–Samani.
 * Returns null when Tmax < Tmin (invalid inputs — do not invent).
 */
export function dailyHargreavesEt0(
  tempMaxCelsius: number,
  tempMinCelsius: number,
  latitudeDegrees: number,
  dayOfYear: number,
): number | null {
  if (tempMaxCelsius < tempMinCelsius) {
    return null;
  }
  const tmean = (tempMaxCelsius + tempMinCelsius) / 2;
  const deltaT = tempMaxCelsius - tempMinCelsius;
  const ra = extraterrestrialRadiationMm(latitudeDegrees, dayOfYear);
  return 0.0023 * (tmean + 17.8) * Math.sqrt(deltaT) * ra;
}

/**
 * Sums daily Hargreaves ET0 over days with valid temps.
 * Days with Tmax < Tmin are skipped; empty → null.
 */
export function accumulateEt0(
  days: Et0DailyTemps[],
  latitudeDegrees: number,
): Et0Accumulation | null {
  if (days.length === 0) {
    return null;
  }

  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let total = 0;
  let included = 0;
  let periodStart: string | null = null;
  let periodEnd: string | null = null;

  for (const day of sorted) {
    const doy = dayOfYearFromIsoDate(day.date);
    const et0 = dailyHargreavesEt0(
      day.tempMaxCelsius,
      day.tempMinCelsius,
      latitudeDegrees,
      doy,
    );
    if (et0 === null) {
      continue;
    }
    total += et0;
    included += 1;
    if (!periodStart) {
      periodStart = day.date;
    }
    periodEnd = day.date;
  }

  if (included === 0 || !periodStart || !periodEnd) {
    return null;
  }

  return {
    totalEt0Mm: Math.round(total * 100) / 100,
    daysIncluded: included,
    periodStart,
    periodEnd,
  };
}
