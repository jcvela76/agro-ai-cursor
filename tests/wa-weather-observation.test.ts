import { describe, expect, it } from "vitest";
import { GetParcelWeatherObservation } from "@/application/weather/get-parcel-weather";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineWeatherSource } from "@/infrastructure/weather/offline-weather-source";

describe("WA-01: fresh observation with complete evidence", () => {
  it("returns observation with source, time, spatial scope and freshness", async () => {
    const useCase = new GetParcelWeatherObservation(
      new SyntheticParcelRegistry(),
      new OfflineWeatherSource(),
    );

    const result = await useCase.execute({
      authority: defaultSyntheticSnapshots[0],
      parcelId: "parcel-lima-norte-001",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.temperatureCelsius).toBe(22.4);
      expect(result.data.evidence.sourceId).toBeTruthy();
      expect(result.data.evidence.observedAt).toBeTruthy();
      expect(result.data.evidence.timezone).toBe("America/Lima");
      expect(result.data.evidence.spatialScope.kind).toBe("point");
      expect(result.data.evidence.freshnessStatus).toBe("fresh");
    }
  });
});
