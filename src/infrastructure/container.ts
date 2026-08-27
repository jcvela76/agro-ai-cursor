import { GetParcelWeatherForecast, GetParcelWeatherObservation } from "@/application/weather/get-parcel-weather";
import type { AccessResolver } from "@/domain/auth/access-resolver";
import { SyntheticAccessResolver } from "@/infrastructure/auth/synthetic-access-resolver";
import { ClerkMetadataAccessResolver } from "@/infrastructure/auth/clerk-metadata-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineWeatherSource } from "@/infrastructure/weather/offline-weather-source";

const parcelRegistry = new SyntheticParcelRegistry();
const weatherSource = new OfflineWeatherSource();

export const getParcelWeatherObservation = new GetParcelWeatherObservation(
  parcelRegistry,
  weatherSource,
);

export const getParcelWeatherForecast = new GetParcelWeatherForecast(
  parcelRegistry,
  weatherSource,
);

export function createAccessResolver(): AccessResolver {
  if (process.env.CLERK_SECRET_KEY) {
    return new ClerkMetadataAccessResolver();
  }
  return new SyntheticAccessResolver([]);
}
