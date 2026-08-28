import { describe, expect, it } from "vitest";
import { createWeatherSource } from "@/infrastructure/container";
import { FreeTierWeatherSource } from "@/infrastructure/weather/free-tier-weather-source";
import { OfflineWeatherSource } from "@/infrastructure/weather/offline-weather-source";
import { SenamhiStubWeatherSource } from "@/infrastructure/weather/senamhi-stub-weather-source";

describe("QA-2: weather source factory", () => {
  it("defaults to offline source", () => {
    const previous = process.env.WEATHER_SOURCE;
    delete process.env.WEATHER_SOURCE;
    try {
      expect(createWeatherSource()).toBeInstanceOf(OfflineWeatherSource);
    } finally {
      if (previous === undefined) {
        delete process.env.WEATHER_SOURCE;
      } else {
        process.env.WEATHER_SOURCE = previous;
      }
    }
  });

  it("selects free tier composite source", () => {
    expect(createWeatherSource("free")).toBeInstanceOf(FreeTierWeatherSource);
  });

  it("selects senamhi stub without live API", () => {
    expect(createWeatherSource("senamhi_stub")).toBeInstanceOf(SenamhiStubWeatherSource);
    expect(() => createWeatherSource("senamhi")).toThrow(/disabled until contract/);
  });
});
