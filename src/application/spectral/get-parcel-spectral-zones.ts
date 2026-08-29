import type { ParcelRegistry } from "@/domain/parcel/types";
import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import {
  authorizeWeatherAccess,
  authorizeWeatherPlusAccess,
} from "@/domain/auth/authorize-weather-access";
import { buildSpectralZones } from "@/domain/spectral/build-spectral-zones";
import { clampLegendValue, getSpectralLegend } from "@/domain/spectral/overlay-legends";
import { partitionParcelZones } from "@/domain/spectral/partition-zones";
import type {
  ParcelSpectralZones,
  SpectralEvidence,
  SpectralResult,
  SpectralSource,
  VegetationIndexId,
} from "@/domain/spectral/types";
import { VEGETATION_INDEX_CATALOG } from "@/domain/spectral/vegetation-indices";

function deterministicNoise(seed: string): number {
  let hash = 0;
  for (let k = 0; k < seed.length; k += 1) {
    hash = (hash * 31 + seed.charCodeAt(k)) >>> 0;
  }
  return (hash % 1000) / 1000;
}

function syntheticZoneValues(
  parcelId: string,
  indexId: VegetationIndexId,
  parcelMean: number | null,
  geometry: import("@/domain/parcel/types").ParcelGeometry,
): Map<string, number | null> {
  const legend = getSpectralLegend(indexId);
  const mean = parcelMean ?? (legend.min + legend.max) / 2;
  const spread = Math.max(0.06, (legend.max - legend.min) * 0.18);
  const cells = partitionParcelZones(geometry);
  const map = new Map<string, number | null>();
  for (const cell of cells) {
    const noise = deterministicNoise(`${parcelId}:${indexId}:${cell.id}`) - 0.5;
    map.set(cell.id, clampLegendValue(mean + noise * spread, legend));
  }
  return map;
}

export interface GetParcelSpectralZonesInput {
  authority: AccessSnapshot | null | undefined;
  parcelId: string;
  indexId: VegetationIndexId;
  /** When set with parcelMean, skips a second vegetation-indices provider call. */
  acquiredAt?: string;
  parcelMean?: number | null;
}

export class GetParcelSpectralZones {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly spectralSource: SpectralSource,
  ) {}

  async execute(input: GetParcelSpectralZonesInput): Promise<SpectralResult<ParcelSpectralZones>> {
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
        message: "Spectral zones require a parcel polygon.",
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

    const meta = VEGETATION_INDEX_CATALOG[input.indexId];
    let parcelMean = input.parcelMean ?? null;
    let acquiredAt = input.acquiredAt?.trim() || "";
    let baseEvidence: SpectralEvidence;

    const canSkipIndices =
      Boolean(acquiredAt) && input.parcelMean !== undefined && Number.isFinite(Date.parse(acquiredAt));

    if (!canSkipIndices) {
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
      parcelMean = reading.value;
      baseEvidence = indicesResult.data.evidence;
      acquiredAt = baseEvidence.acquiredAt;
    } else {
      baseEvidence = {
        sourceId: "client-scene-hint",
        sourceLabel: "Escena activa (cliente)",
        acquiredAt,
        timezone: parcel.timezone,
        spatialScope: {
          kind: "point",
          latitude: parcel.latitude,
          longitude: parcel.longitude,
          label: parcel.id,
        },
        freshnessStatus: "unknown",
        freshnessPolicy: "zones_acquired_at_hint",
      };
    }

    if (this.spectralSource.getIndexZones) {
      const live = await this.spectralSource.getIndexZones({
        parcelId: parcel.id,
        indexId: input.indexId,
        geometry: parcel.geometry,
        acquiredAt,
        parcelMean,
      });
      if (live.ok) {
        return {
          ok: true,
          data: {
            kind: "spectral_zones",
            indexId: input.indexId,
            label: meta.label,
            methodId: `${meta.methodId}+zones/v1`,
            parcelMean: live.data.parcelMean ?? parcelMean,
            zones: live.data.zones,
            evidence: {
              ...baseEvidence,
              freshnessPolicy: `${baseEvidence.freshnessPolicy}|zones_fishnet_3`,
            },
          },
        };
      }
      // Fall through to synthetic partition if provider zones fail.
    }

    const zones = buildSpectralZones({
      geometry: parcel.geometry,
      valuesByCellId: syntheticZoneValues(
        parcel.id,
        input.indexId,
        parcelMean,
        parcel.geometry,
      ),
    });

    return {
      ok: true,
      data: {
        kind: "spectral_zones",
        indexId: input.indexId,
        label: meta.label,
        methodId: `${meta.methodId}+zones_synthetic/v1`,
        parcelMean,
        zones,
        evidence: {
          ...baseEvidence,
          freshnessPolicy: `${baseEvidence.freshnessPolicy}|zones_synthetic_fishnet`,
        },
      },
    };
  }
}
