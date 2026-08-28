import {
  GetParcelWeatherForecast,
  GetParcelWeatherObservation,
} from "@/application/weather/get-parcel-weather";
import {
  defaultSyntheticSnapshots,
  SyntheticAccessResolver,
} from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineWeatherSource } from "@/infrastructure/weather/offline-weather-source";

const parcels = new SyntheticParcelRegistry();
const source = new OfflineWeatherSource();

export const weatherRouteContainerMock = {
  createAccessResolver: () => new SyntheticAccessResolver(defaultSyntheticSnapshots),
  getParcelWeatherObservation: new GetParcelWeatherObservation(parcels, source),
  getParcelWeatherForecast: new GetParcelWeatherForecast(parcels, source),
};

export { defaultSyntheticSnapshots };
