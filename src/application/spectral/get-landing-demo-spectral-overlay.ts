import {
  LANDING_DEMO_GEOMETRY,
  LANDING_DEMO_PARCEL_ID,
  findLandingDemoScene,
  landingDemoAcquiredAt,
  landingDemoIndexValue,
} from "@/content/landing/spectral-demo";
import { getSpectralLegend } from "@/domain/spectral/overlay-legends";
import { buildSyntheticOverlayGrid } from "@/domain/spectral/synthetic-overlay-grid";
import type {
  ParcelSpectralOverlay,
  SpectralResult,
  SpectralSource,
  VegetationIndexId,
} from "@/domain/spectral/types";
import { VEGETATION_INDEX_CATALOG } from "@/domain/spectral/vegetation-indices";

const EMPTY_GRID: ParcelSpectralOverlay["grid"] = {
  type: "FeatureCollection",
  features: [],
};

export class GetLandingDemoSpectralOverlay {
  constructor(private readonly spectralSource: SpectralSource) {}

  async execute(input: {
    indexId: VegetationIndexId;
    acquisitionDate: string;
  }): Promise<SpectralResult<ParcelSpectralOverlay>> {
    const scene = findLandingDemoScene(input.acquisitionDate);
    if (!scene) {
      return {
        ok: false,
        reason: "unsupported_range",
        message: "Escena no disponible en la demo pública.",
      };
    }

    const legend = getSpectralLegend(input.indexId);
    const value = landingDemoIndexValue(scene, input.indexId);
    const acquiredAt = landingDemoAcquiredAt(scene);
    const base = {
      kind: "spectral_overlay" as const,
      indexId: input.indexId,
      label: VEGETATION_INDEX_CATALOG[input.indexId].label,
      value,
      legend,
    };

    if (this.spectralSource.getIndexOverlay) {
      const raster = await this.spectralSource.getIndexOverlay({
        parcelId: LANDING_DEMO_PARCEL_ID,
        indexId: input.indexId,
        geometry: LANDING_DEMO_GEOMETRY,
        acquiredAt,
        colorCenter: value,
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
            geometry: LANDING_DEMO_GEOMETRY,
            parcelId: LANDING_DEMO_PARCEL_ID,
            meanValue: value,
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
          geometry: LANDING_DEMO_GEOMETRY,
          parcelId: LANDING_DEMO_PARCEL_ID,
          meanValue: value,
          legend,
          indexId: input.indexId,
        }),
        rendering: "synthetic_grid",
      },
    };
  }
}
