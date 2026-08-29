import { describe, expect, it } from "vitest";
import {
  LOW_RAIN_RANKING_METHOD_ID,
  rankLowRainDaysFromForecast,
} from "@/domain/weather/rank-low-rain-days";
import type { WeatherForecast } from "@/domain/weather/types";

const evidence: WeatherForecast["evidence"] = {
  sourceId: "test",
  sourceLabel: "Test",
  timezone: "America/Lima",
  spatialScope: {
    kind: "point",
    latitude: -12,
    longitude: -77,
    label: "parcel-test",
  },
  freshnessStatus: "fresh",
  freshnessPolicy: "forecast_max_age_12h",
};

describe("rankLowRainDaysFromForecast", () => {
  it("ranks by ascending precipitation probability", () => {
    const forecast: WeatherForecast = {
      kind: "forecast",
      days: [
        {
          date: "2026-08-27",
          tempMinCelsius: 16,
          tempMaxCelsius: 24,
          precipitationMm: 2,
          precipitationProbability: 0.4,
          relativeHumidityPercent: 70,
          windSpeedMetersPerSecond: 2.5,
        },
        {
          date: "2026-08-28",
          tempMinCelsius: 15,
          tempMaxCelsius: 23,
          precipitationMm: 0.2,
          precipitationProbability: 0.1,
          relativeHumidityPercent: 60,
          windSpeedMetersPerSecond: 2.0,
        },
        {
          date: "2026-08-29",
          tempMinCelsius: 15,
          tempMaxCelsius: 22,
          precipitationMm: 1,
          precipitationProbability: 0.25,
          relativeHumidityPercent: 65,
          windSpeedMetersPerSecond: 2.2,
        },
      ],
      evidence,
    };

    const result = rankLowRainDaysFromForecast(forecast);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.kind).toBe("low_rain_days");
      expect(result.data.rankingMethodId).toBe(LOW_RAIN_RANKING_METHOD_ID);
      expect(result.data.days.map((d) => d.date)).toEqual([
        "2026-08-28",
        "2026-08-29",
        "2026-08-27",
      ]);
      expect(result.data.days[0].rank).toBe(1);
      expect(result.data.daysWithProbability).toBe(3);
      expect(result.data.daysInHorizon).toBe(3);
    }
  });

  it("excludes days without probability and fails if none remain", () => {
    const withoutProb: WeatherForecast = {
      kind: "forecast",
      days: [
        {
          date: "2026-08-27",
          tempMinCelsius: 16,
          tempMaxCelsius: 24,
          precipitationMm: 2,
          relativeHumidityPercent: null,
          windSpeedMetersPerSecond: null,
        },
      ],
      evidence,
    };
    const missing = rankLowRainDaysFromForecast(withoutProb);
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.reason).toBe("unavailable");
    }

    const mixed: WeatherForecast = {
      kind: "forecast",
      days: [
        {
          date: "2026-08-27",
          tempMinCelsius: 16,
          tempMaxCelsius: 24,
          precipitationMm: 2,
          relativeHumidityPercent: null,
          windSpeedMetersPerSecond: null,
        },
        {
          date: "2026-08-28",
          tempMinCelsius: 15,
          tempMaxCelsius: 23,
          precipitationMm: 0.2,
          precipitationProbability: 0.05,
          relativeHumidityPercent: 55,
          windSpeedMetersPerSecond: 1.8,
        },
      ],
      evidence,
    };
    const result = rankLowRainDaysFromForecast(mixed);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.days).toHaveLength(1);
      expect(result.data.daysInHorizon).toBe(2);
      expect(result.data.daysWithProbability).toBe(1);
    }
  });
});
