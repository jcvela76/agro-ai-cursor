import type { ParcelRegistry } from "@/domain/parcel/types";
import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import { authorizeWeatherAccess } from "@/domain/auth/authorize-weather-access";
import type {
  WeatherForecast,
  WeatherObservation,
  WeatherResult,
  WeatherSource,
} from "@/domain/weather/types";
import {
  denyUnlessPaidWeatherProvider,
  type WeatherUseCaseOptions,
} from "@/application/weather/weather-use-case-options";

export interface GetParcelWeatherInput {
  authority: AccessSnapshot | null | undefined;
  parcelId: string;
}

export class GetParcelWeatherObservation {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly weatherSource: WeatherSource,
    private readonly options: WeatherUseCaseOptions = {},
  ) {}

  async execute(input: GetParcelWeatherInput): Promise<WeatherResult<WeatherObservation>> {
    const parcel = await this.parcels.getParcel(input.parcelId);
    if (!parcel) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Weather data is not available for this request.",
      };
    }

    const access = authorizeWeatherAccess(input.authority, input.parcelId, parcel.orgId);
    if (!access.ok) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Weather data is not available for this request.",
      };
    }

    const paidDeny = denyUnlessPaidWeatherProvider(
      input.authority,
      this.options.requirePaidWeatherProvider,
    );
    if (paidDeny) {
      return paidDeny;
    }

    return this.weatherSource.getObservation(input.parcelId);
  }
}

export class GetParcelWeatherForecast {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly weatherSource: WeatherSource,
    private readonly options: WeatherUseCaseOptions = {},
  ) {}

  async execute(input: GetParcelWeatherInput): Promise<WeatherResult<WeatherForecast>> {
    const parcel = await this.parcels.getParcel(input.parcelId);
    if (!parcel) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Weather data is not available for this request.",
      };
    }

    const access = authorizeWeatherAccess(input.authority, input.parcelId, parcel.orgId);
    if (!access.ok) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Weather data is not available for this request.",
      };
    }

    const paidDeny = denyUnlessPaidWeatherProvider(
      input.authority,
      this.options.requirePaidWeatherProvider,
    );
    if (paidDeny) {
      return paidDeny;
    }

    return this.weatherSource.getForecast(input.parcelId);
  }
}
