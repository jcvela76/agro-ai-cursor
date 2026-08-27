import type {
  WeatherForecast,
  WeatherLowRainDays,
  WeatherResult,
} from "@/domain/weather/types";

export const LOW_RAIN_RANKING_METHOD_ID = "forecast-low-precip-probability/v1";
export const LOW_RAIN_RANKING_METHOD_LABEL =
  "Días del horizonte de pronóstico ordenados por menor probabilidad máxima de precipitación";

/**
 * Ranks forecast days by ascending precipitationProbability (0–1).
 * Days without probability are excluded; if none remain → unavailable.
 */
export function rankLowRainDaysFromForecast(
  forecast: WeatherForecast,
): WeatherResult<WeatherLowRainDays> {
  if (forecast.days.length === 0) {
    return {
      ok: false,
      reason: "unavailable",
      message: "No forecast days available for this parcel.",
    };
  }

  const withProbability = forecast.days.filter(
    (d): d is typeof d & { precipitationProbability: number } =>
      typeof d.precipitationProbability === "number",
  );

  if (withProbability.length === 0) {
    return {
      ok: false,
      reason: "unavailable",
      message:
        "Forecast days do not include precipitation probability; low-rain ranking is not available.",
    };
  }

  const ranked = [...withProbability]
    .sort((a, b) => {
      const byProb = a.precipitationProbability - b.precipitationProbability;
      if (byProb !== 0) {
        return byProb;
      }
      return a.date.localeCompare(b.date);
    })
    .map((day, index) => ({
      date: day.date,
      precipitationProbability: day.precipitationProbability,
      precipitationMm: day.precipitationMm,
      rank: index + 1,
    }));

  return {
    ok: true,
    data: {
      kind: "low_rain_days",
      rankingMethodId: LOW_RAIN_RANKING_METHOD_ID,
      rankingMethodLabel: LOW_RAIN_RANKING_METHOD_LABEL,
      horizonStart: forecast.days[0].date,
      horizonEnd: forecast.days[forecast.days.length - 1].date,
      daysInHorizon: forecast.days.length,
      daysWithProbability: withProbability.length,
      days: ranked,
      evidence: forecast.evidence,
    },
  };
}
