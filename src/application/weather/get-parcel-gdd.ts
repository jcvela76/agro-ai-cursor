import type { ParcelRegistry } from "@/domain/parcel/types";
import type { ParcelAgronomicProfileRegistry } from "@/domain/parcel/agronomic-profile";
import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import {
  authorizeWeatherAccess,
  authorizeWeatherPlusAccess,
} from "@/domain/auth/authorize-weather-access";
import type { WeatherGdd, WeatherResult, WeatherSource } from "@/domain/weather/types";
import { campaignQueryForParcel } from "@/application/weather/campaign-from-profile";

export interface GetParcelWeatherInput {
  authority: AccessSnapshot | null | undefined;
  parcelId: string;
}

export class GetParcelWeatherGdd {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly weatherSource: WeatherSource,
    private readonly profiles: ParcelAgronomicProfileRegistry,
  ) {}

  async execute(input: GetParcelWeatherInput): Promise<WeatherResult<WeatherGdd>> {
    if (!authorizeWeatherPlusAccess(input.authority)) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Weather Intelligence Plus is required for growing degree day estimates.",
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

    const query = await campaignQueryForParcel({
      profiles: this.profiles,
      orgId: parcel.orgId,
      parcelId: input.parcelId,
      includeGddBase: true,
    });
    return this.weatherSource.getGdd(input.parcelId, query);
  }
}
