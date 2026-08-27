import { describe, expect, it } from "vitest";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { NasaPowerWeatherSource } from "@/infrastructure/weather/nasa-power-weather-source";

const parcels = new SyntheticParcelRegistry();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("NasaPowerWeatherSource", () => {
  it("maps latest daily observation into evidence-complete result", async () => {
    const fetchFn = async () =>
      jsonResponse({
        header: { fill_value: -999 },
        properties: {
          parameter: {
            T2M: {
              "20260820": -999,
              "20260821": 21.5,
              "20260822": 22.1,
              "20260823": 22.4,
              "20260824": -999,
              "20260825": -999,
              "20260826": -999,
            },
            PRECTOTCORR: {
              "20260820": -999,
              "20260821": 0.2,
              "20260822": 0.1,
              "20260823": 0.0,
              "20260824": -999,
              "20260825": -999,
              "20260826": -999,
            },
          },
        },
      });

    const source = new NasaPowerWeatherSource(
      parcels,
      fetchFn,
      "https://power.larc.nasa.gov/api/temporal/daily/point",
      () => new Date("2026-08-26T18:00:00Z"),
    );
    const result = await source.getObservation("parcel-lima-norte-001");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.temperatureCelsius).toBe(22.4);
      expect(result.data.precipitationMm).toBe(0);
      expect(result.data.evidence.sourceId).toBe("nasa-power");
      expect(result.data.evidence.observedAt).toContain("2026-08-23");
      expect(result.data.evidence.freshnessStatus).toBe("stale");
      expect(result.data.evidence.freshnessPolicy).toBe(
        "latest_available_daily_max_lag_14d",
      );
      expect(result.data.evidence.spatialScope.label).toBe("parcel-lima-norte-001");
    }
  });

  it("WA-08: unknown payload fails safely without leaking raw content", async () => {
    const fetchFn = async () => jsonResponse({ error: "TRACE_DUMP_XYZ" });
    const source = new NasaPowerWeatherSource(parcels, fetchFn);
    const result = await source.getObservation("parcel-lima-norte-001");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("internal_error");
      expect(result.message).not.toContain("TRACE_DUMP_XYZ");
    }
  });

  it("sums daily precipitation over 30 days for WQ-11", async () => {
    const precips: Record<string, number> = {};
    for (let d = 1; d <= 30; d += 1) {
      precips[`202608${String(d).padStart(2, "0")}`] = d === 15 ? 0 : 0.5;
    }

    const fetchFn = async () =>
      jsonResponse({
        header: { fill_value: -999 },
        properties: {
          parameter: {
            PRECTOTCORR: precips,
          },
        },
      });

    const source = new NasaPowerWeatherSource(
      parcels,
      fetchFn,
      "https://power.larc.nasa.gov/api/temporal/daily/point",
      () => new Date("2026-08-30T12:00:00Z"),
    );
    const result = await source.getRainfall30d("parcel-lima-norte-001");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.kind).toBe("rainfall_30d");
      expect(result.data.daysIncluded).toBe(30);
      expect(result.data.totalPrecipitationMm).toBe(14.5);
      expect(result.data.evidence.sourceId).toBe("nasa-power");
      expect(result.data.evidence.freshnessPolicy).toBe(
        "sum_daily_precip_30d_max_lag_14d_per_day",
      );
    }
  });

  it("compares campaign YTD vs prior year for WQ-12", async () => {
    const precips: Record<string, number> = {
      "20250101": 0.5,
      "20250823": 1.0,
      "20260101": 3.0,
      "20260823": 2.0,
    };

    const fetchFn = async () =>
      jsonResponse({
        header: { fill_value: -999 },
        properties: {
          parameter: {
            PRECTOTCORR: precips,
          },
        },
      });

    const source = new NasaPowerWeatherSource(
      parcels,
      fetchFn,
      "https://power.larc.nasa.gov/api/temporal/daily/point",
      () => new Date("2026-08-26T12:00:00Z"),
    );
    const result = await source.getRainfallCampaignComparison("parcel-lima-norte-001");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.kind).toBe("rainfall_campaign_comparison");
      expect(result.data.comparisonMethodId).toBe(
        "campaign-vs-prior-year-calendar-ytd/v1",
      );
      expect(result.data.campaign.periodStart).toBe("2026-01-01");
      expect(result.data.campaign.periodEnd).toBe("2026-08-23");
      expect(result.data.reference.periodStart).toBe("2025-01-01");
      expect(result.data.reference.periodEnd).toBe("2025-08-23");
      expect(result.data.campaign.totalPrecipitationMm).toBe(5);
      expect(result.data.reference.totalPrecipitationMm).toBe(1.5);
      expect(result.data.deltaMm).toBe(3.5);
      expect(result.data.deltaPercent).toBeCloseTo(233.33, 1);
      expect(result.data.evidence.freshnessPolicy).toBe(
        "campaign_vs_prior_year_calendar_ytd_v1",
      );
    }
  });

  it("returns unavailable for low-rain days (WQ-13 requires forecast probability)", async () => {
    const source = new NasaPowerWeatherSource(parcels, async () => {
      throw new Error("should not fetch");
    });
    const result = await source.getLowRainDays("parcel-lima-norte-001");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("unavailable");
      expect(result.message).toContain("precipitation probability");
    }
  });

  it("accumulates campaign YTD GDD from T2M_MAX/T2M_MIN (WQ-14)", async () => {
    const fetchFn = async () =>
      jsonResponse({
        header: { fill_value: -999 },
        properties: {
          parameter: {
            T2M_MAX: {
              "20260101": 22,
              "20260102": 24,
              "20260823": 20,
              "20260824": -999,
            },
            T2M_MIN: {
              "20260101": 12,
              "20260102": 14,
              "20260823": 10,
              "20260824": 8,
            },
          },
        },
      });

    const source = new NasaPowerWeatherSource(
      parcels,
      fetchFn,
      "https://power.larc.nasa.gov/api/temporal/daily/point",
      () => new Date("2026-08-26T12:00:00Z"),
    );
    const result = await source.getGdd("parcel-lima-norte-001");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.kind).toBe("gdd");
      expect(result.data.calculationMethodId).toBe("gdd-mean-base10-calendar-ytd/v1");
      expect(result.data.baseTempCelsius).toBe(10);
      // (22+12)/2-10=7; (24+14)/2-10=9; (20+10)/2-10=5 → 21
      expect(result.data.totalGdd).toBe(21);
      expect(result.data.daysIncluded).toBe(3);
      expect(result.data.periodStart).toBe("2026-01-01");
      expect(result.data.periodEnd).toBe("2026-08-23");
      expect(result.data.evidence.freshnessPolicy).toBe("gdd_mean_base10_calendar_ytd_v1");
    }
  });

  it("accumulates campaign YTD ET0 via Hargreaves–Samani (WQ-15)", async () => {
    const fetchFn = async () =>
      jsonResponse({
        header: { fill_value: -999 },
        properties: {
          parameter: {
            T2M_MAX: {
              "20260101": 22,
              "20260102": 24,
              "20260823": 20,
              "20260824": -999,
            },
            T2M_MIN: {
              "20260101": 12,
              "20260102": 14,
              "20260823": 10,
              "20260824": 8,
            },
          },
        },
      });

    const source = new NasaPowerWeatherSource(
      parcels,
      fetchFn,
      "https://power.larc.nasa.gov/api/temporal/daily/point",
      () => new Date("2026-08-26T12:00:00Z"),
    );
    const result = await source.getEt0("parcel-lima-norte-001");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.kind).toBe("et0");
      expect(result.data.calculationMethodId).toBe(
        "et0-hargreaves-samani-calendar-ytd/v1",
      );
      expect(result.data.daysIncluded).toBe(3);
      expect(result.data.periodStart).toBe("2026-01-01");
      expect(result.data.periodEnd).toBe("2026-08-23");
      expect(result.data.totalEt0Mm).toBeGreaterThan(0);
      expect(result.data.evidence.freshnessPolicy).toBe(
        "et0_hargreaves_samani_calendar_ytd_v1",
      );
    }
  });
});
