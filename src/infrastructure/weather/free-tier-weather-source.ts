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

/** Routes observation to NASA POWER and forecast to Open-Meteo (free tier). */
export class FreeTierWeatherSource implements WeatherSource {
  constructor(
    private readonly observationSource: WeatherSource,
    private readonly forecastSource: WeatherSource,
  ) {}

  getObservation(parcelId: string): Promise<WeatherResult<WeatherObservation>> {
    return this.observationSource.getObservation(parcelId);
  }

  getForecast(parcelId: string): Promise<WeatherResult<WeatherForecast>> {
    return this.forecastSource.getForecast(parcelId);
  }

  getRainfall30d(parcelId: string): Promise<WeatherResult<WeatherRainfall30d>> {
    return this.observationSource.getRainfall30d(parcelId);
  }

  getRainfallCampaignComparison(
    parcelId: string,
    query?: WeatherCampaignQuery,
  ): Promise<WeatherResult<WeatherRainfallCampaignComparison>> {
    return this.observationSource.getRainfallCampaignComparison(parcelId, query);
  }

  getLowRainDays(parcelId: string): Promise<WeatherResult<WeatherLowRainDays>> {
    return this.forecastSource.getLowRainDays(parcelId);
  }

  getGdd(
    parcelId: string,
    query?: WeatherCampaignQuery,
  ): Promise<WeatherResult<WeatherGdd>> {
    return this.observationSource.getGdd(parcelId, query);
  }

  getEt0(
    parcelId: string,
    query?: WeatherCampaignQuery,
  ): Promise<WeatherResult<WeatherEt0>> {
    return this.observationSource.getEt0(parcelId, query);
  }
}
