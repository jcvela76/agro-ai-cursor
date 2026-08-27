import type {
  WeatherForecast,
  WeatherObservation,
  WeatherResult,
  WeatherSource,
} from "@/domain/weather/types";
import observations from "@/infrastructure/fixtures/weather-observations.json";
import forecasts from "@/infrastructure/fixtures/weather-forecasts.json";

type ObservationFixture = WeatherObservation;
type ForecastFixture = WeatherForecast;

export class OfflineWeatherSource implements WeatherSource {
  private readonly observations: Map<string, ObservationFixture>;
  private readonly forecasts: Map<string, ForecastFixture>;

  constructor(
    observationFixtures: ObservationFixture[] = observations as ObservationFixture[],
    forecastFixtures: ForecastFixture[] = forecasts as ForecastFixture[],
  ) {
    this.observations = new Map(
      observationFixtures.map((o) => [o.evidence.spatialScope.label, o]),
    );
    this.forecasts = new Map(
      forecastFixtures.map((f) => [f.evidence.spatialScope.label, f]),
    );
  }

  async getObservation(parcelId: string): Promise<WeatherResult<WeatherObservation>> {
    const data = this.observations.get(parcelId);
    if (!data) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No observation fixture exists for this parcel.",
      };
    }

    if (data.evidence.freshnessStatus === "stale") {
      return {
        ok: false,
        reason: "stale",
        message: "The latest observation is no longer sufficiently fresh.",
      };
    }

    return { ok: true, data };
  }

  async getForecast(parcelId: string): Promise<WeatherResult<WeatherForecast>> {
    const data = this.forecasts.get(parcelId);
    if (!data) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No forecast fixture exists for this parcel.",
      };
    }

    return { ok: true, data };
  }
}
