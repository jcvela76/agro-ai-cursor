import type {
  WeatherForecast,
  WeatherObservation,
  WeatherRainfall30d,
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
}
