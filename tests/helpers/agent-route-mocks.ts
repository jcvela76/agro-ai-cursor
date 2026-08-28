import { GetParcelVegetationIndices } from "@/application/spectral/get-parcel-vegetation-indices";
import { GetParcelWeatherEt0 } from "@/application/weather/get-parcel-et0";
import { GetParcelWeatherGdd } from "@/application/weather/get-parcel-gdd";
import { GetParcelWeatherLowRainDays } from "@/application/weather/get-parcel-low-rain-days";
import { GetParcelWeatherRainfall30d } from "@/application/weather/get-parcel-rainfall-30d";
import { GetParcelWeatherRainfallCampaignComparison } from "@/application/weather/get-parcel-rainfall-campaign-comparison";
import {
  GetParcelWeatherForecast,
  GetParcelWeatherObservation,
} from "@/application/weather/get-parcel-weather";
import {
  defaultSyntheticSnapshots,
  SyntheticAccessResolver,
} from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";
import { OfflineWeatherSource } from "@/infrastructure/weather/offline-weather-source";

const parcels = new SyntheticParcelRegistry();
const weather = new OfflineWeatherSource();
const spectral = new OfflineSpectralSource();

export const agentRouteContainerMock = {
  createAccessResolver: () => new SyntheticAccessResolver(defaultSyntheticSnapshots),
  getParcelWeatherObservation: new GetParcelWeatherObservation(parcels, weather),
  getParcelWeatherForecast: new GetParcelWeatherForecast(parcels, weather),
  getParcelWeatherRainfall30d: new GetParcelWeatherRainfall30d(parcels, weather),
  getParcelWeatherRainfallCampaignComparison: new GetParcelWeatherRainfallCampaignComparison(
    parcels,
    weather,
  ),
  getParcelWeatherLowRainDays: new GetParcelWeatherLowRainDays(parcels, weather),
  getParcelWeatherGdd: new GetParcelWeatherGdd(parcels, weather),
  getParcelWeatherEt0: new GetParcelWeatherEt0(parcels, weather),
  getParcelVegetationIndices: new GetParcelVegetationIndices(parcels, spectral),
};

export { defaultSyntheticSnapshots };
