export const GDD_CALCULATION_METHOD_ID = "gdd-mean-base-campaign/v2";
export const GDD_CALCULATION_METHOD_LABEL =
  "Grados-día (Tmax+Tmin)/2 − base °C, suma campaña (siembra o YTD)";
export const GDD_BASE_TEMP_CELSIUS = 10;

export interface GddDailyTemps {
  date: string;
  tempMaxCelsius: number;
  tempMinCelsius: number;
}

export interface GddAccumulation {
  totalGdd: number;
  daysIncluded: number;
  periodStart: string;
  periodEnd: string;
  baseTempCelsius: number;
}

/**
 * Sums daily GDD = max(0, (Tmax + Tmin) / 2 − Tbase).
 * Days without both temps are excluded by the caller.
 */
export function accumulateGdd(
  days: GddDailyTemps[],
  baseTempCelsius: number = GDD_BASE_TEMP_CELSIUS,
): GddAccumulation | null {
  if (days.length === 0) {
    return null;
  }

  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let total = 0;
  for (const day of sorted) {
    const mean = (day.tempMaxCelsius + day.tempMinCelsius) / 2;
    total += Math.max(0, mean - baseTempCelsius);
  }

  return {
    totalGdd: Math.round(total * 100) / 100,
    daysIncluded: sorted.length,
    periodStart: sorted[0].date,
    periodEnd: sorted[sorted.length - 1].date,
    baseTempCelsius,
  };
}
