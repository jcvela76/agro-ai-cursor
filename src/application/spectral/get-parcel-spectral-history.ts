import type { ParcelRegistry } from "@/domain/parcel/types";
import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import {
  authorizeWeatherAccess,
  authorizeWeatherPlusAccess,
} from "@/domain/auth/authorize-weather-access";
import type {
  SpectralSceneRecord,
  SpectralSceneRegistry,
} from "@/domain/spectral/scene-history";
import type { SpectralLimitationReason } from "@/domain/spectral/types";

export interface GetParcelSpectralHistoryInput {
  authority: AccessSnapshot | null | undefined;
  parcelId: string;
  days?: number;
}

export type ParcelSpectralHistory =
  | { ok: true; data: { kind: "spectral_history"; days: number; scenes: SpectralSceneRecord[] } }
  | { ok: false; reason: SpectralLimitationReason; message: string };

export class GetParcelSpectralHistory {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly sceneHistory: SpectralSceneRegistry,
  ) {}

  async execute(input: GetParcelSpectralHistoryInput): Promise<ParcelSpectralHistory> {
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
        message: "Spectral history is not available for this request.",
      };
    }

    const access = authorizeWeatherAccess(input.authority, input.parcelId, parcel.orgId);
    if (!access.ok) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Spectral history is not available for this request.",
      };
    }

    const days = Math.min(Math.max(input.days ?? 90, 1), 365);
    const scenes = await this.sceneHistory.listByParcel({
      orgId: parcel.orgId,
      parcelId: parcel.id,
      days,
    });

    return {
      ok: true,
      data: {
        kind: "spectral_history",
        days,
        scenes,
      },
    };
  }
}
