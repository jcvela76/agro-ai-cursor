import { describe, expect, it } from "vitest";
import { createAgroAgentTools, isPlusToolAllowed } from "@/agents/agro-agent/tools";
import { GetParcelWeatherGdd } from "@/application/weather/get-parcel-gdd";
import { GetParcelWeatherLowRainDays } from "@/application/weather/get-parcel-low-rain-days";
import { GetParcelWeatherRainfall30d } from "@/application/weather/get-parcel-rainfall-30d";
import { GetParcelWeatherRainfallCampaignComparison } from "@/application/weather/get-parcel-rainfall-campaign-comparison";
import { GetParcelWeatherForecast, GetParcelWeatherObservation } from "@/application/weather/get-parcel-weather";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineWeatherSource } from "@/infrastructure/weather/offline-weather-source";

describe("WA-07 Plus gate for Agro Agent", () => {
  it("denies base weather user without weather_plus", () => {
    expect(isPlusToolAllowed({ authority: defaultSyntheticSnapshots[0] })).toBe(false);
  });

  it("allows Plus-entitled user", () => {
    expect(isPlusToolAllowed({ authority: defaultSyntheticSnapshots[4] })).toBe(true);
  });
});

describe("Agro Agent weather tools", () => {
  const registry = new SyntheticParcelRegistry();
  const source = new OfflineWeatherSource();
  const observation = new GetParcelWeatherObservation(registry, source);
  const forecast = new GetParcelWeatherForecast(registry, source);
  const rainfall30d = new GetParcelWeatherRainfall30d(registry, source);
  const rainfallCampaignComparison = new GetParcelWeatherRainfallCampaignComparison(
    registry,
    source,
  );
  const lowRainDays = new GetParcelWeatherLowRainDays(registry, source);
  const gdd = new GetParcelWeatherGdd(registry, source);
  const authority = defaultSyntheticSnapshots[4];

  function toolsFor(parcelId: string) {
    return createAgroAgentTools({
      authority,
      parcelId,
      observation,
      forecast,
      rainfall30d,
      rainfallCampaignComparison,
      lowRainDays,
      gdd,
    });
  }

  it("returns observation evidence for authorized parcel", async () => {
    const tools = toolsFor("parcel-lima-norte-001");
    const result = (await tools.getParcelWeatherObservation.execute!(
      {},
      { toolCallId: "t1", messages: [] },
    )) as Awaited<ReturnType<NonNullable<typeof tools.getParcelWeatherObservation.execute>>>;
    expect(result).toMatchObject({ ok: true });
    if ("ok" in result && result.ok) {
      expect(result.data.kind).toBe("observation");
      expect(result.data.evidence.sourceId).toBeTruthy();
    }
  });

  it("returns forecast for authorized parcel", async () => {
    const tools = toolsFor("parcel-lima-norte-001");
    const result = (await tools.getParcelWeatherForecast.execute!(
      {},
      { toolCallId: "t2", messages: [] },
    )) as Awaited<ReturnType<NonNullable<typeof tools.getParcelWeatherForecast.execute>>>;
    expect(result).toMatchObject({ ok: true });
    if ("ok" in result && result.ok) {
      expect(result.data.kind).toBe("forecast");
      expect(result.data.days.length).toBeGreaterThan(0);
    }
  });

  it("returns 30-day rainfall for Plus parcel", async () => {
    const tools = toolsFor("parcel-lima-norte-001");
    const result = (await tools.getParcelRainfall30d.execute!(
      {},
      { toolCallId: "t3", messages: [] },
    )) as Awaited<ReturnType<NonNullable<typeof tools.getParcelRainfall30d.execute>>>;
    expect(result).toMatchObject({ ok: true });
    if ("ok" in result && result.ok) {
      expect(result.data.kind).toBe("rainfall_30d");
      expect(result.data.totalPrecipitationMm).toBe(12.4);
    }
  });

  it("returns campaign comparison for Plus parcel", async () => {
    const tools = toolsFor("parcel-lima-norte-001");
    const result = (await tools.getParcelRainfallCampaignComparison.execute!(
      {},
      { toolCallId: "t4", messages: [] },
    )) as Awaited<
      ReturnType<NonNullable<typeof tools.getParcelRainfallCampaignComparison.execute>>
    >;
    expect(result).toMatchObject({ ok: true });
    if ("ok" in result && result.ok) {
      expect(result.data.kind).toBe("rainfall_campaign_comparison");
      expect(result.data.comparisonMethodId).toBe(
        "campaign-vs-prior-year-calendar-ytd/v1",
      );
      expect(result.data.deltaMm).toBe(6.5);
    }
  });

  it("returns low-rain days ranking for Plus parcel", async () => {
    const tools = toolsFor("parcel-lima-norte-001");
    const result = (await tools.getParcelLowRainDays.execute!(
      {},
      { toolCallId: "t5", messages: [] },
    )) as Awaited<ReturnType<NonNullable<typeof tools.getParcelLowRainDays.execute>>>;
    expect(result).toMatchObject({ ok: true });
    if ("ok" in result && result.ok) {
      expect(result.data.kind).toBe("low_rain_days");
      expect(result.data.rankingMethodId).toBe("forecast-low-precip-probability/v1");
      expect(result.data.days[0].date).toBe("2026-08-28");
    }
  });

  it("returns GDD accumulation for Plus parcel", async () => {
    const tools = toolsFor("parcel-lima-norte-001");
    const result = (await tools.getParcelGdd.execute!(
      {},
      { toolCallId: "t6", messages: [] },
    )) as Awaited<ReturnType<NonNullable<typeof tools.getParcelGdd.execute>>>;
    expect(result).toMatchObject({ ok: true });
    if ("ok" in result && result.ok) {
      expect(result.data.kind).toBe("gdd");
      expect(result.data.calculationMethodId).toBe("gdd-mean-base10-calendar-ytd/v1");
      expect(result.data.totalGdd).toBe(1842.5);
    }
  });
});
