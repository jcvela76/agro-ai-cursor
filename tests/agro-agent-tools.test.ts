import { describe, expect, it } from "vitest";
import { createAgroAgentTools, isPlusToolAllowed } from "@/agents/agro-agent/tools";
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
  const authority = defaultSyntheticSnapshots[4];

  it("returns observation evidence for authorized parcel", async () => {
    const tools = createAgroAgentTools({
      authority,
      parcelId: "parcel-lima-norte-001",
      observation,
      forecast,
      rainfall30d,
      rainfallCampaignComparison,
    });
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
    const tools = createAgroAgentTools({
      authority,
      parcelId: "parcel-lima-norte-001",
      observation,
      forecast,
      rainfall30d,
      rainfallCampaignComparison,
    });
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
    const tools = createAgroAgentTools({
      authority,
      parcelId: "parcel-lima-norte-001",
      observation,
      forecast,
      rainfall30d,
      rainfallCampaignComparison,
    });
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
    const tools = createAgroAgentTools({
      authority,
      parcelId: "parcel-lima-norte-001",
      observation,
      forecast,
      rainfall30d,
      rainfallCampaignComparison,
    });
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
});
