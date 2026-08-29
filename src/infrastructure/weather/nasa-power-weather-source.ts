import type { ParcelRegistry } from "@/domain/parcel/types";
import {
  accumulateGdd,
  GDD_CALCULATION_METHOD_ID,
  GDD_CALCULATION_METHOD_LABEL,
} from "@/domain/weather/compute-gdd";
import {
  accumulateEt0,
  ET0_CALCULATION_METHOD_ID,
  ET0_CALCULATION_METHOD_LABEL,
} from "@/domain/weather/compute-et0";
import {
  campaignMethodSuffix,
  resolveWeatherCampaignQuery,
  shiftIsoDateYears,
} from "@/domain/weather/campaign-query";
import type {
  WeatherCampaignQuery,
  WeatherEt0,
  WeatherForecast,
  WeatherGdd,
  WeatherLowRainDays,
  WeatherObservation,
  WeatherRainfall30d,
  WeatherRainfallCampaignComparison,
  WeatherResult,
  WeatherSource,
} from "@/domain/weather/types";
import type { Parcel } from "@/domain/parcel/types";
import type { FetchFn } from "@/infrastructure/weather/open-meteo-weather-source";

interface NasaPowerResponse {
  properties?: {
    parameter?: {
      T2M?: Record<string, number>;
      T2M_MAX?: Record<string, number>;
      T2M_MIN?: Record<string, number>;
      PRECTOTCORR?: Record<string, number>;
    };
  };
  header?: {
    fill_value?: number;
  };
}

function isNasaPowerResponse(payload: unknown): payload is NasaPowerResponse {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const parameter = (payload as NasaPowerResponse).properties?.parameter;
  return Boolean(parameter && typeof parameter === "object");
}

function formatYmd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function parseYmdToIso(ymd: string): string {
  const year = ymd.slice(0, 4);
  const month = ymd.slice(4, 6);
  const day = ymd.slice(6, 8);
  return `${year}-${month}-${day}T12:00:00`;
}

const LOOKBACK_DAYS = 14;
const RAINFALL_WINDOW_DAYS = 30;
const FRESH_MAX_AGE_MS = 48 * 60 * 60 * 1000;
const CAMPAIGN_COMPARISON_METHOD_ID = "campaign-vs-prior-year/v2";
const CAMPAIGN_COMPARISON_METHOD_LABEL =
  "Campaña (siembra o YTD) vs mismo rango año anterior";

function isoToUtcDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function ymdToIsoDate(ymd: string): string {
  const year = ymd.slice(0, 4);
  const month = ymd.slice(4, 6);
  const day = ymd.slice(6, 8);
  return `${year}-${month}-${day}`;
}

function observationFreshness(
  observedYmd: string,
  now: Date,
): "fresh" | "stale" {
  const year = Number(observedYmd.slice(0, 4));
  const month = Number(observedYmd.slice(4, 6));
  const day = Number(observedYmd.slice(6, 8));
  const observed = Date.UTC(year, month - 1, day, 12, 0, 0);
  const ageMs = now.getTime() - observed;
  return ageMs <= FRESH_MAX_AGE_MS ? "fresh" : "stale";
}

function sumPrecipitation(
  precips: Record<string, number>,
  dates: string[],
): number {
  return dates.reduce((sum, key) => sum + precips[key], 0);
}

/** NASA POWER free daily observation adapter. Forecast is not provided by this source. */
export class NasaPowerWeatherSource implements WeatherSource {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly fetchFn: FetchFn = fetch,
    private readonly baseUrl = "https://power.larc.nasa.gov/api/temporal/daily/point",
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getForecast(): Promise<WeatherResult<WeatherForecast>> {
    return {
      ok: false,
      reason: "unavailable",
      message: "NASA POWER adapter does not provide forecasts in this release.",
    };
  }

  async getObservation(parcelId: string): Promise<WeatherResult<WeatherObservation>> {
    const parcel = await this.parcels.getParcel(parcelId);
    if (!parcel) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No observation fixture exists for this parcel.",
      };
    }

    const end = this.now();
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - LOOKBACK_DAYS);

    const url = new URL(this.baseUrl);
    url.searchParams.set("parameters", "T2M,PRECTOTCORR");
    url.searchParams.set("community", "AG");
    url.searchParams.set("longitude", String(parcel.longitude));
    url.searchParams.set("latitude", String(parcel.latitude));
    url.searchParams.set("start", formatYmd(start));
    url.searchParams.set("end", formatYmd(end));
    url.searchParams.set("format", "JSON");

    let payload: unknown;
    try {
      const response = await this.fetchFn(url.toString());
      if (!response.ok) {
        return {
          ok: false,
          reason: "internal_error",
          message: "Weather provider request failed.",
        };
      }
      payload = await response.json();
    } catch {
      return {
        ok: false,
        reason: "internal_error",
        message: "Weather provider request failed.",
      };
    }

    if (!isNasaPowerResponse(payload)) {
      return {
        ok: false,
        reason: "internal_error",
        message: "Weather provider returned an unexpected payload.",
      };
    }

    const fillValue = payload.header?.fill_value ?? -999;
    const temps = payload.properties?.parameter?.T2M ?? {};
    const precips = payload.properties?.parameter?.PRECTOTCORR ?? {};
    const dates = Object.keys(temps)
      .filter((key) => {
        const t = temps[key];
        const p = precips[key];
        return (
          typeof t === "number" &&
          t !== fillValue &&
          typeof p === "number" &&
          p !== fillValue
        );
      })
      .sort();

    const latest = dates[dates.length - 1];
    if (!latest) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No observation available for this parcel.",
      };
    }

    const now = this.now();
    const freshnessStatus = observationFreshness(latest, now);

    return {
      ok: true,
      data: {
        kind: "observation",
        temperatureCelsius: temps[latest],
        precipitationMm: precips[latest],
        evidence: {
          sourceId: "nasa-power",
          sourceLabel: "NASA POWER",
          observedAt: parseYmdToIso(latest),
          timezone: parcel.timezone,
          spatialScope: {
            kind: "point",
            latitude: parcel.latitude,
            longitude: parcel.longitude,
            label: parcel.id,
          },
          freshnessStatus,
          freshnessPolicy: "latest_available_daily_max_lag_14d",
        },
      },
    };
  }

  async getRainfall30d(parcelId: string): Promise<WeatherResult<WeatherRainfall30d>> {
    const parcel = await this.parcels.getParcel(parcelId);
    if (!parcel) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No rainfall data exists for this parcel.",
      };
    }

    const end = this.now();
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (RAINFALL_WINDOW_DAYS - 1));

    const series = await this.fetchDailyPrecipitation(parcel, start, end);
    if (!series.ok) {
      return series;
    }

    const { precips, validDates } = series.data;
    if (validDates.length === 0) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Insufficient daily precipitation data for a 30-day sum.",
      };
    }

    const totalPrecipitationMm = sumPrecipitation(precips, validDates);
    const periodStart = ymdToIsoDate(validDates[0]);
    const periodEnd = ymdToIsoDate(validDates[validDates.length - 1]);
    const latestYmd = validDates[validDates.length - 1];
    const freshnessStatus = observationFreshness(latestYmd, this.now());

    return {
      ok: true,
      data: {
        kind: "rainfall_30d",
        totalPrecipitationMm,
        daysIncluded: validDates.length,
        periodStart,
        periodEnd,
        evidence: {
          sourceId: "nasa-power",
          sourceLabel: "NASA POWER",
          validFrom: periodStart,
          validTo: periodEnd,
          timezone: parcel.timezone,
          spatialScope: {
            kind: "point",
            latitude: parcel.latitude,
            longitude: parcel.longitude,
            label: parcel.id,
          },
          freshnessStatus,
          freshnessPolicy: "sum_daily_precip_30d_max_lag_14d_per_day",
        },
      },
    };
  }

  async getRainfallCampaignComparison(
    parcelId: string,
    query?: WeatherCampaignQuery,
  ): Promise<WeatherResult<WeatherRainfallCampaignComparison>> {
    const parcel = await this.parcels.getParcel(parcelId);
    if (!parcel) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No rainfall comparison data exists for this parcel.",
      };
    }

    const now = this.now();
    const campaign = resolveWeatherCampaignQuery(query, now);
    const referenceStart = shiftIsoDateYears(campaign.startDate, -1);
    const referenceEnd = shiftIsoDateYears(campaign.endDate, -1);
    const fetchStart = isoToUtcDate(referenceStart);
    const fetchEnd = isoToUtcDate(campaign.endDate);

    const series = await this.fetchDailyPrecipitation(parcel, fetchStart, fetchEnd);
    if (!series.ok) {
      return series;
    }

    const { precips, validDates } = series.data;
    const campaignStartYmd = campaign.startDate.replaceAll("-", "");
    const campaignEndYmd = campaign.endDate.replaceAll("-", "");
    const referenceStartYmd = referenceStart.replaceAll("-", "");
    const referenceEndYmd = referenceEnd.replaceAll("-", "");

    const campaignDates = validDates.filter(
      (d) => d >= campaignStartYmd && d <= campaignEndYmd,
    );
    const referenceDates = validDates.filter(
      (d) => d >= referenceStartYmd && d <= referenceEndYmd,
    );

    if (campaignDates.length === 0 || referenceDates.length === 0) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Insufficient paired precipitation data for campaign comparison.",
      };
    }

    const campaignTotal = sumPrecipitation(precips, campaignDates);
    const referenceTotal = sumPrecipitation(precips, referenceDates);
    const deltaMm = campaignTotal - referenceTotal;
    const deltaPercent =
      referenceTotal === 0 ? null : (deltaMm / referenceTotal) * 100;

    const campaignStartIso = ymdToIsoDate(campaignDates[0]!);
    const campaignEndIso = ymdToIsoDate(campaignDates[campaignDates.length - 1]!);
    const referenceStartIso = ymdToIsoDate(referenceDates[0]!);
    const referenceEndIso = ymdToIsoDate(referenceDates[referenceDates.length - 1]!);
    const latestCampaignYmd = campaignDates[campaignDates.length - 1]!;
    const freshnessStatus = observationFreshness(latestCampaignYmd, now);
    const suffix = campaignMethodSuffix(campaign.source);

    return {
      ok: true,
      data: {
        kind: "rainfall_campaign_comparison",
        comparisonMethodId: `${CAMPAIGN_COMPARISON_METHOD_ID}/${suffix}`,
        comparisonMethodLabel: `${CAMPAIGN_COMPARISON_METHOD_LABEL} (${suffix})`,
        campaignSource: campaign.source,
        campaign: {
          totalPrecipitationMm: campaignTotal,
          daysIncluded: campaignDates.length,
          periodStart: campaignStartIso,
          periodEnd: campaignEndIso,
        },
        reference: {
          totalPrecipitationMm: referenceTotal,
          daysIncluded: referenceDates.length,
          periodStart: referenceStartIso,
          periodEnd: referenceEndIso,
        },
        deltaMm: Math.round(deltaMm * 100) / 100,
        deltaPercent:
          deltaPercent === null ? null : Math.round(deltaPercent * 10) / 10,
        evidence: {
          sourceId: "nasa-power",
          sourceLabel: "NASA POWER",
          validFrom: campaignStartIso,
          validTo: campaignEndIso,
          timezone: parcel.timezone,
          spatialScope: {
            kind: "point",
            latitude: parcel.latitude,
            longitude: parcel.longitude,
            label: parcel.id,
          },
          freshnessStatus,
          freshnessPolicy: `campaign_vs_prior_${suffix}_v2`,
        },
      },
    };
  }

  private async fetchDailyPrecipitation(
    parcel: Parcel,
    start: Date,
    end: Date,
  ): Promise<
    WeatherResult<{ precips: Record<string, number>; validDates: string[] }>
  > {
    const url = new URL(this.baseUrl);
    url.searchParams.set("parameters", "PRECTOTCORR");
    url.searchParams.set("community", "AG");
    url.searchParams.set("longitude", String(parcel.longitude));
    url.searchParams.set("latitude", String(parcel.latitude));
    url.searchParams.set("start", formatYmd(start));
    url.searchParams.set("end", formatYmd(end));
    url.searchParams.set("format", "JSON");

    let payload: unknown;
    try {
      const response = await this.fetchFn(url.toString());
      if (!response.ok) {
        return {
          ok: false,
          reason: "internal_error",
          message: "Weather provider request failed.",
        };
      }
      payload = await response.json();
    } catch {
      return {
        ok: false,
        reason: "internal_error",
        message: "Weather provider request failed.",
      };
    }

    if (!isNasaPowerResponse(payload)) {
      return {
        ok: false,
        reason: "internal_error",
        message: "Weather provider returned an unexpected payload.",
      };
    }

    const fillValue = payload.header?.fill_value ?? -999;
    const precips = payload.properties?.parameter?.PRECTOTCORR ?? {};
    const validDates = Object.keys(precips)
      .filter((key) => {
        const p = precips[key];
        return typeof p === "number" && p !== fillValue;
      })
      .sort();

    return { ok: true, data: { precips, validDates } };
  }

  async getGdd(
    parcelId: string,
    query?: WeatherCampaignQuery,
  ): Promise<WeatherResult<WeatherGdd>> {
    const parcel = await this.parcels.getParcel(parcelId);
    if (!parcel) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No GDD data exists for this parcel.",
      };
    }

    const now = this.now();
    const campaign = resolveWeatherCampaignQuery(query, now);
    const series = await this.fetchDailyTempsMaxMin(
      parcel,
      isoToUtcDate(campaign.startDate),
      isoToUtcDate(campaign.endDate),
    );
    if (!series.ok) {
      return series;
    }

    const { tmax, tmin, validDates } = series.data;
    if (validDates.length === 0) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Insufficient daily max/min temperature data for GDD calculation.",
      };
    }

    const days = validDates.map((ymd) => ({
      date: ymdToIsoDate(ymd),
      tempMaxCelsius: tmax[ymd]!,
      tempMinCelsius: tmin[ymd]!,
    }));
    const accumulation = accumulateGdd(days, campaign.baseTempCelsius);
    if (!accumulation) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Insufficient daily max/min temperature data for GDD calculation.",
      };
    }

    const latestYmd = validDates[validDates.length - 1]!;
    const freshnessStatus = observationFreshness(latestYmd, now);
    const suffix = campaignMethodSuffix(campaign.source);

    return {
      ok: true,
      data: {
        kind: "gdd",
        calculationMethodId: `${GDD_CALCULATION_METHOD_ID}/${suffix}`,
        calculationMethodLabel: `${GDD_CALCULATION_METHOD_LABEL} (${suffix})`,
        baseTempCelsius: accumulation.baseTempCelsius,
        campaignSource: campaign.source,
        totalGdd: accumulation.totalGdd,
        daysIncluded: accumulation.daysIncluded,
        periodStart: accumulation.periodStart,
        periodEnd: accumulation.periodEnd,
        evidence: {
          sourceId: "nasa-power",
          sourceLabel: "NASA POWER",
          validFrom: accumulation.periodStart,
          validTo: accumulation.periodEnd,
          timezone: parcel.timezone,
          spatialScope: {
            kind: "point",
            latitude: parcel.latitude,
            longitude: parcel.longitude,
            label: parcel.id,
          },
          freshnessStatus,
          freshnessPolicy: `gdd_mean_base_campaign_${suffix}_v2`,
        },
      },
    };
  }

  async getEt0(
    parcelId: string,
    query?: WeatherCampaignQuery,
  ): Promise<WeatherResult<WeatherEt0>> {
    const parcel = await this.parcels.getParcel(parcelId);
    if (!parcel) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No ET0 data exists for this parcel.",
      };
    }

    const now = this.now();
    const campaign = resolveWeatherCampaignQuery(query, now);
    const series = await this.fetchDailyTempsMaxMin(
      parcel,
      isoToUtcDate(campaign.startDate),
      isoToUtcDate(campaign.endDate),
    );
    if (!series.ok) {
      return series;
    }

    const { tmax, tmin, validDates } = series.data;
    if (validDates.length === 0) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Insufficient daily max/min temperature data for ET0 calculation.",
      };
    }

    const days = validDates.map((ymd) => ({
      date: ymdToIsoDate(ymd),
      tempMaxCelsius: tmax[ymd]!,
      tempMinCelsius: tmin[ymd]!,
    }));
    const accumulation = accumulateEt0(days, parcel.latitude);
    if (!accumulation) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Insufficient daily max/min temperature data for ET0 calculation.",
      };
    }

    const latestYmd = validDates[validDates.length - 1]!;
    const freshnessStatus = observationFreshness(latestYmd, now);
    const suffix = campaignMethodSuffix(campaign.source);

    return {
      ok: true,
      data: {
        kind: "et0",
        calculationMethodId: `${ET0_CALCULATION_METHOD_ID}/${suffix}`,
        calculationMethodLabel: `${ET0_CALCULATION_METHOD_LABEL} (${suffix})`,
        campaignSource: campaign.source,
        totalEt0Mm: accumulation.totalEt0Mm,
        daysIncluded: accumulation.daysIncluded,
        periodStart: accumulation.periodStart,
        periodEnd: accumulation.periodEnd,
        evidence: {
          sourceId: "nasa-power",
          sourceLabel: "NASA POWER",
          validFrom: accumulation.periodStart,
          validTo: accumulation.periodEnd,
          timezone: parcel.timezone,
          spatialScope: {
            kind: "point",
            latitude: parcel.latitude,
            longitude: parcel.longitude,
            label: parcel.id,
          },
          freshnessStatus,
          freshnessPolicy: `et0_hargreaves_campaign_${suffix}_v2`,
        },
      },
    };
  }

  private async fetchDailyTempsMaxMin(
    parcel: Parcel,
    start: Date,
    end: Date,
  ): Promise<
    WeatherResult<{
      tmax: Record<string, number>;
      tmin: Record<string, number>;
      validDates: string[];
    }>
  > {
    const url = new URL(this.baseUrl);
    url.searchParams.set("parameters", "T2M_MAX,T2M_MIN");
    url.searchParams.set("community", "AG");
    url.searchParams.set("longitude", String(parcel.longitude));
    url.searchParams.set("latitude", String(parcel.latitude));
    url.searchParams.set("start", formatYmd(start));
    url.searchParams.set("end", formatYmd(end));
    url.searchParams.set("format", "JSON");

    let payload: unknown;
    try {
      const response = await this.fetchFn(url.toString());
      if (!response.ok) {
        return {
          ok: false,
          reason: "internal_error",
          message: "Weather provider request failed.",
        };
      }
      payload = await response.json();
    } catch {
      return {
        ok: false,
        reason: "internal_error",
        message: "Weather provider request failed.",
      };
    }

    if (!isNasaPowerResponse(payload)) {
      return {
        ok: false,
        reason: "internal_error",
        message: "Weather provider returned an unexpected payload.",
      };
    }

    const fillValue = payload.header?.fill_value ?? -999;
    const tmax = payload.properties?.parameter?.T2M_MAX ?? {};
    const tmin = payload.properties?.parameter?.T2M_MIN ?? {};
    const validDates = Object.keys(tmax)
      .filter((key) => {
        const max = tmax[key];
        const min = tmin[key];
        return (
          typeof max === "number" &&
          max !== fillValue &&
          typeof min === "number" &&
          min !== fillValue
        );
      })
      .sort();

    return { ok: true, data: { tmax, tmin, validDates } };
  }

  async getLowRainDays(parcelId: string): Promise<WeatherResult<WeatherLowRainDays>> {
    void parcelId;
    return {
      ok: false,
      reason: "unavailable",
      message:
        "NASA POWER does not provide forecast precipitation probability for low-rain day ranking.",
    };
  }
}
