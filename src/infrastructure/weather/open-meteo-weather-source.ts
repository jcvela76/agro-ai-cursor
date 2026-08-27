import type { ParcelRegistry } from "@/domain/parcel/types";
import { rankLowRainDaysFromForecast } from "@/domain/weather/rank-low-rain-days";
import type {
  WeatherForecast,
  WeatherGdd,
  WeatherForecastDay,
  WeatherLowRainDays,
  WeatherObservation,
  WeatherRainfall30d,
  WeatherRainfallCampaignComparison,
  WeatherResult,
  WeatherSource,
} from "@/domain/weather/types";

export type FetchFn = typeof fetch;

interface OpenMeteoDailyResponse {
  daily?: {
    time?: string[];
    temperature_2m_max?: Array<number | null>;
    temperature_2m_min?: Array<number | null>;
    precipitation_sum?: Array<number | null>;
    precipitation_probability_max?: Array<number | null>;
  };
  daily_units?: Record<string, string>;
  timezone?: string;
}

function isOpenMeteoDaily(payload: unknown): payload is OpenMeteoDailyResponse {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const daily = (payload as OpenMeteoDailyResponse).daily;
  return Boolean(daily && Array.isArray(daily.time));
}

/** Open-Meteo free forecast adapter. Observation is not provided by this source. */
export class OpenMeteoWeatherSource implements WeatherSource {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly fetchFn: FetchFn = fetch,
    private readonly baseUrl = "https://api.open-meteo.com/v1/forecast",
  ) {}

  async getObservation(): Promise<WeatherResult<WeatherObservation>> {
    return {
      ok: false,
      reason: "unavailable",
      message: "Open-Meteo adapter does not provide observations in this release.",
    };
  }

  async getForecast(parcelId: string): Promise<WeatherResult<WeatherForecast>> {
    const parcel = await this.parcels.getParcel(parcelId);
    if (!parcel) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No observation fixture exists for this parcel.",
      };
    }

    const url = new URL(this.baseUrl);
    url.searchParams.set("latitude", String(parcel.latitude));
    url.searchParams.set("longitude", String(parcel.longitude));
    url.searchParams.set(
      "daily",
      "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
    );
    url.searchParams.set("timezone", parcel.timezone);
    url.searchParams.set("forecast_days", "7");

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

    if (!isOpenMeteoDaily(payload) || !payload.daily?.time?.length) {
      return {
        ok: false,
        reason: "internal_error",
        message: "Weather provider returned an unexpected payload.",
      };
    }

    const times = payload.daily.time;
    const days: WeatherForecastDay[] = [];
    for (let i = 0; i < times.length; i += 1) {
      const tempMax = payload.daily.temperature_2m_max?.[i];
      const tempMin = payload.daily.temperature_2m_min?.[i];
      const precip = payload.daily.precipitation_sum?.[i];
      if (
        typeof tempMax !== "number" ||
        typeof tempMin !== "number" ||
        typeof precip !== "number"
      ) {
        continue;
      }
      const probability = payload.daily.precipitation_probability_max?.[i];
      days.push({
        date: times[i],
        tempMaxCelsius: tempMax,
        tempMinCelsius: tempMin,
        precipitationMm: precip,
        precipitationProbability:
          typeof probability === "number" ? probability / 100 : undefined,
      });
    }

    if (days.length === 0) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No forecast days available for this parcel.",
      };
    }

    const emittedAt = new Date().toISOString();
    const validFrom = `${days[0].date}T00:00:00`;
    const lastDate = days[days.length - 1].date;
    const validTo = `${lastDate}T23:59:59`;

    return {
      ok: true,
      data: {
        kind: "forecast",
        days,
        evidence: {
          sourceId: "open-meteo",
          sourceLabel: "Open-Meteo",
          emittedAt,
          validFrom,
          validTo,
          timezone: parcel.timezone,
          spatialScope: {
            kind: "point",
            latitude: parcel.latitude,
            longitude: parcel.longitude,
            label: parcel.id,
          },
          freshnessStatus: "fresh",
          freshnessPolicy: "forecast_max_age_12h",
        },
      },
    };
  }

  async getRainfall30d(): Promise<WeatherResult<WeatherRainfall30d>> {
    return {
      ok: false,
      reason: "unavailable",
      message: "Open-Meteo adapter does not provide 30-day rainfall aggregation in this release.",
    };
  }

  async getRainfallCampaignComparison(): Promise<
    WeatherResult<WeatherRainfallCampaignComparison>
  > {
    return {
      ok: false,
      reason: "unavailable",
      message:
        "Open-Meteo adapter does not provide campaign rainfall comparison in this release.",
    };
  }

  async getLowRainDays(parcelId: string): Promise<WeatherResult<WeatherLowRainDays>> {
    const forecast = await this.getForecast(parcelId);
    if (!forecast.ok) {
      return forecast;
    }
    return rankLowRainDaysFromForecast(forecast.data);
  }

  async getGdd(): Promise<WeatherResult<WeatherGdd>> {
    return {
      ok: false,
      reason: "unavailable",
      message:
        "Open-Meteo adapter does not provide campaign-year GDD aggregation in this release.",
    };
  }
}
