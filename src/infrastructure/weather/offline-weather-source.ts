import type {
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
import observations from "@/infrastructure/fixtures/weather-observations.json";
import forecasts from "@/infrastructure/fixtures/weather-forecasts.json";
import rainfall30d from "@/infrastructure/fixtures/weather-rainfall-30d.json";
import rainfallCampaignComparison from "@/infrastructure/fixtures/weather-rainfall-campaign-comparison.json";
import lowRainDays from "@/infrastructure/fixtures/weather-low-rain-days.json";
import gdd from "@/infrastructure/fixtures/weather-gdd.json";
import et0 from "@/infrastructure/fixtures/weather-et0.json";

type ObservationFixture = WeatherObservation;
type ForecastFixture = WeatherForecast;
type Rainfall30dFixture = WeatherRainfall30d;
type RainfallCampaignComparisonFixture = WeatherRainfallCampaignComparison;
type LowRainDaysFixture = WeatherLowRainDays;
type GddFixture = WeatherGdd;
type Et0Fixture = WeatherEt0;

export class OfflineWeatherSource implements WeatherSource {
  private readonly observations: Map<string, ObservationFixture>;
  private readonly forecasts: Map<string, ForecastFixture>;
  private readonly rainfall30d: Map<string, Rainfall30dFixture>;
  private readonly rainfallCampaignComparison: Map<string, RainfallCampaignComparisonFixture>;
  private readonly lowRainDays: Map<string, LowRainDaysFixture>;
  private readonly gdd: Map<string, GddFixture>;
  private readonly et0: Map<string, Et0Fixture>;

  constructor(
    observationFixtures: ObservationFixture[] = observations as ObservationFixture[],
    forecastFixtures: ForecastFixture[] = forecasts as ForecastFixture[],
    rainfall30dFixtures: Rainfall30dFixture[] = rainfall30d as Rainfall30dFixture[],
    rainfallCampaignComparisonFixtures: RainfallCampaignComparisonFixture[] = rainfallCampaignComparison as RainfallCampaignComparisonFixture[],
    lowRainDaysFixtures: LowRainDaysFixture[] = lowRainDays as LowRainDaysFixture[],
    gddFixtures: GddFixture[] = gdd as GddFixture[],
    et0Fixtures: Et0Fixture[] = et0 as Et0Fixture[],
  ) {
    this.observations = new Map(
      observationFixtures.map((o) => [o.evidence.spatialScope.label, o]),
    );
    this.forecasts = new Map(
      forecastFixtures.map((f) => [f.evidence.spatialScope.label, f]),
    );
    this.rainfall30d = new Map(
      rainfall30dFixtures.map((r) => [r.evidence.spatialScope.label, r]),
    );
    this.rainfallCampaignComparison = new Map(
      rainfallCampaignComparisonFixtures.map((r) => [r.evidence.spatialScope.label, r]),
    );
    this.lowRainDays = new Map(
      lowRainDaysFixtures.map((r) => [r.evidence.spatialScope.label, r]),
    );
    this.gdd = new Map(gddFixtures.map((r) => [r.evidence.spatialScope.label, r]));
    this.et0 = new Map(et0Fixtures.map((r) => [r.evidence.spatialScope.label, r]));
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

  async getRainfall30d(parcelId: string): Promise<WeatherResult<WeatherRainfall30d>> {
    const data = this.rainfall30d.get(parcelId);
    if (!data) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No 30-day rainfall fixture exists for this parcel.",
      };
    }

    return { ok: true, data };
  }

  async getRainfallCampaignComparison(
    parcelId: string,
  ): Promise<WeatherResult<WeatherRainfallCampaignComparison>> {
    const data = this.rainfallCampaignComparison.get(parcelId);
    if (!data) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No campaign rainfall comparison fixture exists for this parcel.",
      };
    }

    return { ok: true, data };
  }

  async getLowRainDays(parcelId: string): Promise<WeatherResult<WeatherLowRainDays>> {
    const data = this.lowRainDays.get(parcelId);
    if (!data) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No low-rain days fixture exists for this parcel.",
      };
    }

    return { ok: true, data };
  }

  async getGdd(parcelId: string): Promise<WeatherResult<WeatherGdd>> {
    const data = this.gdd.get(parcelId);
    if (!data) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No GDD fixture exists for this parcel.",
      };
    }

    return { ok: true, data };
  }

  async getEt0(parcelId: string): Promise<WeatherResult<WeatherEt0>> {
    const data = this.et0.get(parcelId);
    if (!data) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No ET0 fixture exists for this parcel.",
      };
    }

    return { ok: true, data };
  }
}
