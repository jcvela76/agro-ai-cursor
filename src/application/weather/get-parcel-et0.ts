import type { ParcelRegistry } from "@/domain/parcel/types";
import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import {
  authorizeWeatherAccess,
  authorizeWeatherPlusAccess,
} from "@/domain/auth/authorize-weather-access";
import type { WeatherEt0, WeatherResult, WeatherSource } from "@/domain/weather/types";

export interface GetParcelWeatherInput {
  authority: AccessSnapshot | null | undefined;
  parcelId: string;
}

export class GetParcelWeatherEt0 {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly weatherSource: WeatherSource,
  ) {}

  async execute(input: GetParcelWeatherInput): Promise<WeatherResult<WeatherEt0>> {
    if (!authorizeWeatherPlusAccess(input.authority)) {
      return {
        ok: false,
        reason: "unavailable",
        message:
          "Weather Intelligence Plus is required for reference evapotranspiration estimates.",
      };
    }

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

    return this.weatherSource.getEt0(input.parcelId);
  }
}
