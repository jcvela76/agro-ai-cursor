import type { ParcelRegistry } from "@/domain/parcel/types";
import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import {
  authorizeWeatherAccess,
  authorizeWeatherPlusAccess,
} from "@/domain/auth/authorize-weather-access";
import {
  buildSpectralSceneUpsert,
  persistSpectralScene,
} from "@/domain/spectral/persist-spectral-scene";
import type { SpectralSceneRegistry } from "@/domain/spectral/scene-history";
import type { SpectralLimitationReason, SpectralSource } from "@/domain/spectral/types";

export interface BackfillParcelSpectralHistoryInput {
  authority: AccessSnapshot | null | undefined;
  parcelId: string;
  days?: number;
}

export type ParcelSpectralBackfillResult =
  | {
      ok: true;
      data: {
        kind: "spectral_backfill";
        days: number;
        scenesFound: number;
        scenesPersisted: number;
        acquisitionDates: string[];
      };
    }
  | { ok: false; reason: SpectralLimitationReason; message: string };

function clampDays(days: number | undefined): number {
  const maxDays = Number.parseInt(process.env.SPECTRAL_BACKFILL_MAX_DAYS ?? "90", 10);
  const cap = Number.isFinite(maxDays) && maxDays > 0 ? maxDays : 90;
  return Math.min(Math.max(days ?? 30, 1), cap);
}

export class BackfillParcelSpectralHistory {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly spectralSource: SpectralSource,
    private readonly sceneHistory: SpectralSceneRegistry,
  ) {}

  async execute(input: BackfillParcelSpectralHistoryInput): Promise<ParcelSpectralBackfillResult> {
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
        message: "Spectral backfill is not available for this request.",
      };
    }

    const access = authorizeWeatherAccess(input.authority, input.parcelId, parcel.orgId);
    if (!access.ok) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Spectral backfill is not available for this request.",
      };
    }

    if (!parcel.geometry) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Spectral backfill requires parcel geometry.",
      };
    }

    if (!this.spectralSource.listVegetationIndexScenes) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Historical spectral scenes are not available from this provider.",
      };
    }

    const days = clampDays(input.days);
    const scenesResult = await this.spectralSource.listVegetationIndexScenes(
      parcel.id,
      {
        latitude: parcel.latitude,
        longitude: parcel.longitude,
        geometry: parcel.geometry,
        timezone: parcel.timezone,
      },
      { days },
    );

    if (!scenesResult.ok) {
      return scenesResult;
    }

    let scenesPersisted = 0;
    const acquisitionDates: string[] = [];

    for (const scene of scenesResult.data) {
      acquisitionDates.push(scene.acquisitionDate);
      const persisted = await persistSpectralScene(
        this.sceneHistory,
        buildSpectralSceneUpsert(parcel.orgId, parcel.id, scene),
        "always",
      );
      if (persisted.persisted) {
        scenesPersisted += 1;
      }
    }

    return {
      ok: true,
      data: {
        kind: "spectral_backfill",
        days,
        scenesFound: scenesResult.data.length,
        scenesPersisted,
        acquisitionDates,
      },
    };
  }
}
