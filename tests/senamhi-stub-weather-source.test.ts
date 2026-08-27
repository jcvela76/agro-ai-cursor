import { describe, expect, it } from "vitest";
import { GetParcelWeatherObservation } from "@/application/weather/get-parcel-weather";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import {
  SENAMHI_STUB_SOURCE_ID,
  SenamhiStubWeatherSource,
} from "@/infrastructure/weather/senamhi-stub-weather-source";
import { createWeatherSource } from "@/infrastructure/container";

describe("SenamhiStubWeatherSource", () => {
  it("returns synthetic observation with SENAMHI stub provenance", async () => {
    const source = new SenamhiStubWeatherSource();
    const result = await source.getObservation("parcel-lima-norte-001");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.evidence.sourceId).toBe(SENAMHI_STUB_SOURCE_ID);
      expect(result.data.evidence.sourceLabel).toMatch(/stub offline/i);
      expect(result.data.evidence.sourceLabel).toMatch(/no live API/i);
    }
  });

  it("factory accepts senamhi_stub and rejects live senamhi", () => {
    expect(createWeatherSource("senamhi_stub")).toBeInstanceOf(SenamhiStubWeatherSource);
    expect(() => createWeatherSource("senamhi")).toThrow(/disabled until contract/);
  });
});

describe("SENAMHI paid entitlement gate", () => {
  const parcels = new SyntheticParcelRegistry();
  const source = new SenamhiStubWeatherSource();
  const weatherOnly = defaultSyntheticSnapshots.find((s) => s.userId === "user-agronomist-001")!;
  const plus = defaultSyntheticSnapshots.find((s) => s.userId === "user-plus-005")!;

  it("denies observation when paid provider required without weather_plus", async () => {
    const useCase = new GetParcelWeatherObservation(parcels, source, {
      requirePaidWeatherProvider: true,
    });
    const result = await useCase.execute({
      authority: weatherOnly,
      parcelId: "parcel-lima-norte-001",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("unavailable");
    }
  });

  it("allows observation when weather_plus present", async () => {
    const useCase = new GetParcelWeatherObservation(parcels, source, {
      requirePaidWeatherProvider: true,
    });
    const result = await useCase.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.evidence.sourceId).toBe(SENAMHI_STUB_SOURCE_ID);
    }
  });
});
