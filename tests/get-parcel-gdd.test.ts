import { describe, expect, it } from "vitest";
import { GetParcelWeatherGdd } from "@/application/weather/get-parcel-gdd";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineWeatherSource } from "@/infrastructure/weather/offline-weather-source";

describe("WQ-14: growing degree days (Plus)", () => {
  const registry = new SyntheticParcelRegistry();
  const source = new OfflineWeatherSource();
  const useCase = new GetParcelWeatherGdd(registry, source);

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

  it("returns versioned GDD with evidence for Plus user", async () => {
    const result = await useCase.execute({
      authority: defaultSyntheticSnapshots[4],
      parcelId: "parcel-lima-norte-001",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.kind).toBe("gdd");
      expect(result.data.calculationMethodId).toBe("gdd-mean-base10-calendar-ytd/v1");
      expect(result.data.baseTempCelsius).toBe(10);
      expect(result.data.totalGdd).toBe(1842.5);
      expect(result.data.daysIncluded).toBe(238);
      expect(result.data.evidence.sourceId).toBeTruthy();
    }
  });
});
