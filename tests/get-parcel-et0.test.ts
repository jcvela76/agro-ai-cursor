import { describe, expect, it } from "vitest";
import { GetParcelWeatherEt0 } from "@/application/weather/get-parcel-et0";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineParcelAgronomicProfileRegistry } from "@/infrastructure/parcel/offline-parcel-agronomic-profile-registry";
import { OfflineWeatherSource } from "@/infrastructure/weather/offline-weather-source";

describe("WQ-15: reference ET0 (Plus)", () => {
  const registry = new SyntheticParcelRegistry();
  const source = new OfflineWeatherSource();
  const profiles = new OfflineParcelAgronomicProfileRegistry();
  const useCase = new GetParcelWeatherEt0(registry, source, profiles);

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

  it("returns versioned ET0 with evidence for Plus user", async () => {
    const result = await useCase.execute({
      authority: defaultSyntheticSnapshots[4],
      parcelId: "parcel-lima-norte-001",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.kind).toBe("et0");
      expect(result.data.calculationMethodId).toContain("et0-hargreaves-samani-campaign/v2");
      expect(result.data.campaignSource).toBe("calendar_ytd");
      expect(result.data.totalEt0Mm).toBe(912.4);
      expect(result.data.daysIncluded).toBe(238);
      expect(result.data.evidence.sourceId).toBeTruthy();
    }
  });
});
