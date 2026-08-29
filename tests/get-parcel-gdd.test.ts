import { describe, expect, it } from "vitest";
import { GetParcelWeatherGdd } from "@/application/weather/get-parcel-gdd";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineParcelAgronomicProfileRegistry } from "@/infrastructure/parcel/offline-parcel-agronomic-profile-registry";
import { OfflineWeatherSource } from "@/infrastructure/weather/offline-weather-source";

describe("WQ-14: growing degree days (Plus)", () => {
  const registry = new SyntheticParcelRegistry();
  const source = new OfflineWeatherSource();
  const profiles = new OfflineParcelAgronomicProfileRegistry();
  const useCase = new GetParcelWeatherGdd(registry, source, profiles);

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
      expect(result.data.calculationMethodId).toContain("gdd-mean-base-campaign/v2");
      expect(result.data.campaignSource).toBe("calendar_ytd");
      expect(result.data.baseTempCelsius).toBe(10);
      expect(result.data.totalGdd).toBe(1842.5);
      expect(result.data.daysIncluded).toBe(238);
      expect(result.data.evidence.sourceId).toBeTruthy();
    }
  });
});
