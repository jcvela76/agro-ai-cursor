import type { ParcelRegistry } from "@/domain/parcel/types";
import type {
  WeatherForecast,
  WeatherObservation,
  WeatherRainfall30d,
  WeatherResult,
  WeatherSource,
} from "@/domain/weather/types";
import type { FetchFn } from "@/infrastructure/weather/open-meteo-weather-source";

interface NasaPowerResponse {
  properties?: {
    parameter?: {
      T2M?: Record<string, number>;
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

    if (validDates.length === 0) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Insufficient daily precipitation data for a 30-day sum.",
      };
    }

    const totalPrecipitationMm = validDates.reduce((sum, key) => sum + precips[key], 0);
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
}
