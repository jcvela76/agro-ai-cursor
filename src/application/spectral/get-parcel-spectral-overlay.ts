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
  SpectralEvidence,
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
  /**
   * When set with parcelMean, skips a second vegetation-indices provider call
   * (client already loaded indices for the panel).
   */
  acquiredAt?: string;
  parcelMean?: number | null;
}

const EMPTY_GRID: ParcelSpectralOverlay["grid"] = {
  type: "FeatureCollection",
  features: [],
};

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

    const legend = getSpectralLegend(input.indexId);
    const hintAcquiredAt = input.acquiredAt?.trim() || "";
    const canSkipIndices =
      Boolean(hintAcquiredAt) &&
      input.parcelMean !== undefined &&
      Number.isFinite(Date.parse(hintAcquiredAt));

    let meanValue: number = legend.min;
    let value: number | null = null;
    let evidence: SpectralEvidence;

    if (canSkipIndices) {
      value = input.parcelMean ?? null;
      meanValue = value ?? (legend.min + legend.max) / 2;
      evidence = {
        sourceId: "client-scene-hint",
        sourceLabel: "Escena activa (cliente)",
        acquiredAt: hintAcquiredAt,
        timezone: parcel.timezone,
        spatialScope: {
          kind: "point",
          latitude: parcel.latitude,
          longitude: parcel.longitude,
          label: parcel.id,
        },
        freshnessStatus: "unknown",
        freshnessPolicy: "overlay_acquired_at_hint",
      };
    } else {
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

      value = reading.value;
      meanValue = reading.value ?? legend.min;
      evidence = indicesResult.data.evidence;
    }

    const base = {
      kind: "spectral_overlay" as const,
      indexId: input.indexId,
      label: VEGETATION_INDEX_CATALOG[input.indexId].label,
      value,
      legend,
      evidence,
    };

    if (this.spectralSource.getIndexOverlay) {
      const raster = await this.spectralSource.getIndexOverlay({
        parcelId: parcel.id,
        indexId: input.indexId,
        geometry: parcel.geometry,
        acquiredAt: evidence.acquiredAt,
      });
      if (raster.ok) {
        return {
          ok: true,
          data: {
            ...base,
            grid: EMPTY_GRID,
            raster: raster.data,
            rendering: "sentinel_raster",
          },
        };
      }
      return {
        ok: true,
        data: {
          ...base,
          grid: buildSyntheticOverlayGrid({
            geometry: parcel.geometry,
            parcelId: parcel.id,
            meanValue,
            legend,
            indexId: input.indexId,
          }),
          rendering: "synthetic_grid",
          fallbackReason: raster.message || "Process API no devolvió PNG.",
        },
      };
    }

    return {
      ok: true,
      data: {
        ...base,
        grid: buildSyntheticOverlayGrid({
          geometry: parcel.geometry,
          parcelId: parcel.id,
          meanValue,
          legend,
          indexId: input.indexId,
        }),
        rendering: "synthetic_grid",
      },
    };
  }
}
