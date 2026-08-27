import { ListOrgParcels } from "@/application/parcel/list-org-parcels";
import { GetParcelWeatherForecast, GetParcelWeatherObservation } from "@/application/weather/get-parcel-weather";
import type { AccessResolver } from "@/domain/auth/access-resolver";
import type { ParcelRegistry } from "@/domain/parcel/types";
import type { WeatherSource } from "@/domain/weather/types";
import { SyntheticAccessResolver } from "@/infrastructure/auth/synthetic-access-resolver";
import { ClerkMetadataAccessResolver } from "@/infrastructure/auth/clerk-metadata-access-resolver";
import { createDb } from "@/infrastructure/db/client";
import { NeonParcelRegistry } from "@/infrastructure/parcel/neon-parcel-registry";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { FreeTierWeatherSource } from "@/infrastructure/weather/free-tier-weather-source";
import { NasaPowerWeatherSource } from "@/infrastructure/weather/nasa-power-weather-source";
import { OfflineWeatherSource } from "@/infrastructure/weather/offline-weather-source";
import { OpenMeteoWeatherSource } from "@/infrastructure/weather/open-meteo-weather-source";

export function createParcelRegistry(): ParcelRegistry {
  if (process.env.DATABASE_URL) {
    return new NeonParcelRegistry(createDb());
  }
  return new SyntheticParcelRegistry();
}

const parcelRegistry = createParcelRegistry();

export const listOrgParcels = new ListOrgParcels(parcelRegistry);

export function createWeatherSource(
  mode = process.env.WEATHER_SOURCE ?? "offline",
): WeatherSource {
  switch (mode) {
    case "open-meteo":
      return new OpenMeteoWeatherSource(parcelRegistry);
    case "nasa-power":
      return new NasaPowerWeatherSource(parcelRegistry);
    case "free":
      return new FreeTierWeatherSource(
        new NasaPowerWeatherSource(parcelRegistry),
        new OpenMeteoWeatherSource(parcelRegistry),
      );
    case "offline":
    default:
      return new OfflineWeatherSource();
  }
}

const weatherSource = createWeatherSource();

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
