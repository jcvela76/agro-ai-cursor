import type { ParcelRegistry } from "@/domain/parcel/types";
import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import {
  authorizeWeatherAccess,
  authorizeWeatherPlusAccess,
} from "@/domain/auth/authorize-weather-access";
import { getSpectralLegend } from "@/domain/spectral/overlay-legends";
import { buildSyntheticOverlayGrid } from "@/domain/spectral/synthetic-overlay-grid";
import type {
  ParcelSpectralOverlay,
  SpectralResult,
  SpectralSource,
  VegetationIndexId,
} from "@/domain/spectral/types";
import { VEGETATION_INDEX_CATALOG } from "@/domain/spectral/vegetation-indices";

const INDEX_IDS: VegetationIndexId[] = [
  "ndre",
  "evi",
  "savi",
  "msavi",
  "gndvi",
  "ndwi",
  "ndmi",
  "nbr",
];

export function isVegetationIndexId(value: string): value is VegetationIndexId {
  return (INDEX_IDS as string[]).includes(value);
}

export interface GetParcelSpectralOverlayInput {
  authority: AccessSnapshot | null | undefined;
  parcelId: string;
  indexId: VegetationIndexId;
}

export class GetParcelSpectralOverlay {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly spectralSource: SpectralSource,
  ) {}

  async execute(input: GetParcelSpectralOverlayInput): Promise<SpectralResult<ParcelSpectralOverlay>> {
    if (!authorizeWeatherPlusAccess(input.authority)) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Weather Intelligence Plus is required for vegetation indices.",
      };
    }

    const parcel = await this.parcels.getParcel(input.parcelId);
    if (!parcel?.geometry) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Spectral overlay requires a parcel polygon.",
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

    const indicesResult = await this.spectralSource.getVegetationIndices(input.parcelId, {
      latitude: parcel.latitude,
      longitude: parcel.longitude,
      geometry: parcel.geometry,
      timezone: parcel.timezone,
    });
    if (!indicesResult.ok) {
      return indicesResult;
    }

    const reading = indicesResult.data.indices.find((item) => item.id === input.indexId);
    if (!reading) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Unknown vegetation index.",
      };
    }

    const legend = getSpectralLegend(input.indexId);
    const meanValue = reading.value ?? legend.min;

    return {
      ok: true,
      data: {
        kind: "spectral_overlay",
        indexId: input.indexId,
        label: VEGETATION_INDEX_CATALOG[input.indexId].label,
        value: reading.value,
        legend,
        grid: buildSyntheticOverlayGrid({
          geometry: parcel.geometry,
          parcelId: parcel.id,
          meanValue,
          legend,
          indexId: input.indexId,
        }),
      },
    };
  }
}
