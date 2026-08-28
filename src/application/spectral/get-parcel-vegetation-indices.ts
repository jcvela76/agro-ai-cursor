import type { ParcelRegistry } from "@/domain/parcel/types";
import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import {
  authorizeWeatherAccess,
  authorizeWeatherPlusAccess,
} from "@/domain/auth/authorize-weather-access";
import type { ParcelVegetationIndices, SpectralResult, SpectralSource } from "@/domain/spectral/types";

export interface GetParcelSpectralInput {
  authority: AccessSnapshot | null | undefined;
  parcelId: string;
}

export class GetParcelVegetationIndices {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly spectralSource: SpectralSource,
  ) {}

  async execute(input: GetParcelSpectralInput): Promise<SpectralResult<ParcelVegetationIndices>> {
    if (!authorizeWeatherPlusAccess(input.authority)) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Weather Intelligence Plus is required for vegetation indices.",
      };
    }

    const parcel = await this.parcels.getParcel(input.parcelId);
    if (!parcel) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Spectral data is not available for this request.",
      };
    }

    const access = authorizeWeatherAccess(input.authority, input.parcelId, parcel.orgId);
    if (!access.ok) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Spectral data is not available for this request.",
      };
    }

    return this.spectralSource.getVegetationIndices(input.parcelId, {
      latitude: parcel.latitude,
      longitude: parcel.longitude,
      geometry: parcel.geometry,
      timezone: parcel.timezone,
    });
  }
}
