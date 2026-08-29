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
import { vegetationIndicesFromScene } from "@/domain/spectral/vegetation-indices-from-scene";
import type {
  ParcelVegetationIndices,
  SpectralResult,
  SpectralSource,
} from "@/domain/spectral/types";

export type SpectralIndicesSource = "live" | "cache" | "auto";

export interface GetParcelSpectralInput {
  authority: AccessSnapshot | null | undefined;
  parcelId: string;
  /** always = refresh same-day scene; new_scene_only = skip if acquisition unchanged. */
  persistMode?: SpectralScenePersistMode;
  /**
   * live = CDSE/provider only (default).
   * cache = latest Neon/offline scene only.
   * auto = cache if present, else live.
   */
  source?: SpectralIndicesSource;
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

    const sourceMode = input.source ?? "live";

    if (sourceMode === "cache" || sourceMode === "auto") {
      const cached = await this.readCached(parcel.orgId, parcel.id);
      if (cached) {
        return { ok: true, data: cached };
      }
      if (sourceMode === "cache") {
        return {
          ok: false,
          reason: "unavailable",
          message: "No hay escena espectral guardada para esta parcela.",
        };
      }
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

  private async readCached(
    orgId: string,
    parcelId: string,
  ): Promise<ParcelVegetationIndices | null> {
    if (!this.sceneHistory) {
      return null;
    }
    const latest = await this.sceneHistory.getLatestByParcel({ orgId, parcelId });
    if (!latest || latest.indices.length === 0) {
      return null;
    }
    return vegetationIndicesFromScene(latest);
  }
}
