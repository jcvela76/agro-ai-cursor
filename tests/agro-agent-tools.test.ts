import { describe, expect, it } from "vitest";
import { createAgroAgentTools, isPlusToolAllowed } from "@/agents/agro-agent/tools";
import { GetParcelRecentBriefings } from "@/application/report/get-parcel-recent-briefings";
import {
  GetParcelAgronomicProfile,
  UpdateParcelAgronomicProfile,
} from "@/application/parcel/parcel-agronomic-profile";
import { GetParcelVegetationIndices } from "@/application/spectral/get-parcel-vegetation-indices";
import { GetParcelWeatherEt0 } from "@/application/weather/get-parcel-et0";
import { GetParcelWeatherGdd } from "@/application/weather/get-parcel-gdd";
import { GetParcelWeatherLowRainDays } from "@/application/weather/get-parcel-low-rain-days";
import { GetParcelWeatherRainfall30d } from "@/application/weather/get-parcel-rainfall-30d";
import { GetParcelWeatherRainfallCampaignComparison } from "@/application/weather/get-parcel-rainfall-campaign-comparison";
import { GetParcelWeatherForecast, GetParcelWeatherObservation } from "@/application/weather/get-parcel-weather";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineReportRegistry } from "@/infrastructure/report/offline-report-registry";
import { OfflineParcelAgronomicProfileRegistry } from "@/infrastructure/parcel/offline-parcel-agronomic-profile-registry";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";
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
  const et0 = new GetParcelWeatherEt0(registry, source);
  const vegetationIndices = new GetParcelVegetationIndices(registry, new OfflineSpectralSource());
  const profiles = new OfflineParcelAgronomicProfileRegistry();
  const recentBriefings = new GetParcelRecentBriefings(registry, new OfflineReportRegistry());
  const getProfile = new GetParcelAgronomicProfile(registry, profiles);
  const updateProfile = new UpdateParcelAgronomicProfile(registry, profiles);
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
      et0,
      vegetationIndices,
      recentBriefings,
      getProfile,
      updateProfile,
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

  it("returns ET0 accumulation for Plus parcel", async () => {
    const tools = toolsFor("parcel-lima-norte-001");
    const result = (await tools.getParcelEt0.execute!(
      {},
      { toolCallId: "t7", messages: [] },
    )) as Awaited<ReturnType<NonNullable<typeof tools.getParcelEt0.execute>>>;
    expect(result).toMatchObject({ ok: true });
    if ("ok" in result && result.ok) {
      expect(result.data.kind).toBe("et0");
      expect(result.data.calculationMethodId).toBe(
        "et0-hargreaves-samani-calendar-ytd/v1",
      );
      expect(result.data.totalEt0Mm).toBe(912.4);
    }
  });

  it("returns vegetation indices for Plus parcel", async () => {
    const tools = toolsFor("parcel-lima-norte-001");
    const result = (await tools.getParcelVegetationIndices.execute!(
      {},
      { toolCallId: "t8", messages: [] },
    )) as Awaited<ReturnType<NonNullable<typeof tools.getParcelVegetationIndices.execute>>>;
    expect(result).toMatchObject({ ok: true });
    if ("ok" in result && result.ok) {
      expect(result.data.kind).toBe("vegetation_indices");
      expect(result.data.indices).toHaveLength(8);
      expect(result.data.indices[0]?.id).toBe("ndre");
    }
  });

  it("returns empty recent briefings when none saved", async () => {
    const tools = toolsFor("parcel-lima-norte-001");
    const result = (await tools.getParcelRecentBriefings.execute!(
      {},
      { toolCallId: "t9", messages: [] },
    )) as Awaited<ReturnType<NonNullable<typeof tools.getParcelRecentBriefings.execute>>>;
    expect(result).toMatchObject({ ok: true });
    if ("ok" in result && result.ok) {
      expect(result.data.briefings).toEqual([]);
      expect(result.data.days).toBe(3);
    }
  });

  it("reads and updates parcel profile", async () => {
    const tools = toolsFor("parcel-lima-norte-001");
    const before = (await tools.getParcelProfile.execute!(
      {},
      { toolCallId: "t10", messages: [] },
    )) as Awaited<ReturnType<NonNullable<typeof tools.getParcelProfile.execute>>>;
    expect(before).toMatchObject({ ok: true });

    const updated = (await tools.updateParcelProfile.execute!(
      { irrigationFrequency: "cada 2 días" },
      { toolCallId: "t11", messages: [] },
    )) as Awaited<ReturnType<NonNullable<typeof tools.updateParcelProfile.execute>>>;
    expect(updated).toMatchObject({ ok: true });
    if ("ok" in updated && updated.ok) {
      expect(updated.data.irrigationFrequency).toBe("cada 2 días");
    }
  });
});
