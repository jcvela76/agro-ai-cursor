import type { ParcelRegistry } from "@/domain/parcel/types";
import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import {
  authorizeWeatherAccess,
  authorizeWeatherPlusAccess,
} from "@/domain/auth/authorize-weather-access";
import {
  buildSpectralSceneUpsert,
  persistSpectralScene,
  type SpectralScenePersistMode,
} from "@/domain/spectral/persist-spectral-scene";
import type { SpectralSceneRegistry } from "@/domain/spectral/scene-history";
import type {
  ParcelVegetationIndices,
  SpectralResult,
  SpectralSource,
} from "@/domain/spectral/types";

export interface GetParcelSpectralInput {
  authority: AccessSnapshot | null | undefined;
  parcelId: string;
  /** always = refresh same-day scene; new_scene_only = skip if acquisition unchanged. */
  persistMode?: SpectralScenePersistMode;
}

export class GetParcelVegetationIndices {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly spectralSource: SpectralSource,
    private readonly sceneHistory?: SpectralSceneRegistry | null,
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

    const result = await this.spectralSource.getVegetationIndices(input.parcelId, {
      latitude: parcel.latitude,
      longitude: parcel.longitude,
      geometry: parcel.geometry,
      timezone: parcel.timezone,
    });

    if (result.ok && this.sceneHistory) {
      const mode = input.persistMode ?? "always";
      try {
        await persistSpectralScene(
          this.sceneHistory,
          buildSpectralSceneUpsert(parcel.orgId, parcel.id, result.data),
          mode,
        );
      } catch (error) {
        console.warn("spectral scene persist failed", error);
      }
    }

    return result;
  }
}
