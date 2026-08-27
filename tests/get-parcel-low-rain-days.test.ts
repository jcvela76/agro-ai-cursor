import { describe, expect, it } from "vitest";
import { GetParcelWeatherLowRainDays } from "@/application/weather/get-parcel-low-rain-days";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineWeatherSource } from "@/infrastructure/weather/offline-weather-source";

describe("WQ-13: low-rain days ranking (Plus)", () => {
  const registry = new SyntheticParcelRegistry();
  const source = new OfflineWeatherSource();
  const useCase = new GetParcelWeatherLowRainDays(registry, source);

  it("denies without weather_plus entitlement", async () => {
    const result = await useCase.execute({
      authority: defaultSyntheticSnapshots[0],
      parcelId: "parcel-lima-norte-001",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Plus");
    }
  });

  it("returns ranked low-rain days with evidence for Plus user", async () => {
    const result = await useCase.execute({
      authority: defaultSyntheticSnapshots[4],
      parcelId: "parcel-lima-norte-001",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.kind).toBe("low_rain_days");
      expect(result.data.rankingMethodId).toBe("forecast-low-precip-probability/v1");
      expect(result.data.days[0].date).toBe("2026-08-28");
      expect(result.data.days[0].precipitationProbability).toBe(0.12);
      expect(result.data.days[0].rank).toBe(1);
      expect(result.data.evidence.sourceId).toBeTruthy();
    }
  });
});
