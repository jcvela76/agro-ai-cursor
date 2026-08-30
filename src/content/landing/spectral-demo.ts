import {
  approximateAreaHectares,
  demoParcelSquare,
} from "@/domain/parcel/geometry";
import {
  clampLegendValue,
  colorForLegendValue,
  getSpectralLegend,
} from "@/domain/spectral/overlay-legends";
import { buildSpectralZones } from "@/domain/spectral/build-spectral-zones";
import { partitionParcelZones } from "@/domain/spectral/partition-zones";
import { bboxImageCoordinates } from "@/infrastructure/spectral/sentinel-hub-index-evalscript";
import type { ParcelGeometry } from "@/domain/parcel/types";
import type {
  ParcelSpectralOverlay,
  SpectralZone,
  VegetationIndexId,
  VegetationIndexReading,
} from "@/domain/spectral/types";
import {
  VEGETATION_INDEX_CATALOG,
  VEGETATION_INDEX_ORDER,
} from "@/domain/spectral/vegetation-indices";

/** Valle de Ica — referencia agrícola (smoke Tacama). */
export const LANDING_DEMO_CENTER = {
  label: "Ica · valle Tacama",
  longitude: -75.812,
  latitude: -14.0125,
  timezone: "America/Lima",
} as const;

export const LANDING_DEMO_GEOMETRY: ParcelGeometry = demoParcelSquare(
  LANDING_DEMO_CENTER.longitude,
  LANDING_DEMO_CENTER.latitude,
);

const DEMO_BBOX = (() => {
  const ring = LANDING_DEMO_GEOMETRY.coordinates[0];
  let minLng = ring[0][0];
  let maxLng = ring[0][0];
  let minLat = ring[0][1];
  let maxLat = ring[0][1];
  for (const [lng, lat] of ring) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return { minLng, maxLng, minLat, maxLat };
})();

export const LANDING_DEMO_RASTER_COORDINATES = bboxImageCoordinates(DEMO_BBOX);

export const LANDING_DEMO_PARCEL_NAME = `Parcela demo · Ica · ~${approximateAreaHectares(LANDING_DEMO_GEOMETRY).toFixed(1)} ha`;

export interface LandingDemoScene {
  acquisitionDate: string;
  ndreMean: number;
  seed: number;
}

export const LANDING_DEMO_SCENES: LandingDemoScene[] = [
  { acquisitionDate: "2026-06-12", ndreMean: 0.25, seed: 1.1 },
  { acquisitionDate: "2026-06-27", ndreMean: 0.29, seed: 2.4 },
  { acquisitionDate: "2026-07-13", ndreMean: 0.33, seed: 3.1 },
  { acquisitionDate: "2026-07-29", ndreMean: 0.37, seed: 3.7 },
  { acquisitionDate: "2026-08-14", ndreMean: 0.41, seed: 4.2 },
];

export function formatLandingSceneDate(isoDay: string): string {
  const [year, month, day] = isoDay.split("-").map(Number);
  const months = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ] as const;
  return `${day} ${months[month - 1]} ${year}`;
}

export function ndreVigorLabel(value: number): string {
  if (value < 0.28) return "Vigor bajo";
  if (value < 0.34) return "Vigor medio-bajo";
  if (value < 0.4) return "Vigor medio";
  return "Vigor alto";
}

const INDEX_OFFSETS: Record<VegetationIndexId, number> = {
  ndre: 0,
  evi: 0.03,
  savi: -0.06,
  msavi: -0.05,
  gndvi: 0.02,
  ndwi: -0.18,
  ndmi: 0.09,
  nbr: 0.14,
};

export function landingDemoIndexValue(
  scene: LandingDemoScene,
  indexId: VegetationIndexId,
): number {
  return scene.ndreMean + INDEX_OFFSETS[indexId];
}

export function landingDemoIndices(scene: LandingDemoScene): VegetationIndexReading[] {
  return VEGETATION_INDEX_ORDER.map((id) => {
    const meta = VEGETATION_INDEX_CATALOG[id];
    return {
      id,
      label: meta.label,
      description: meta.description,
      methodId: meta.methodId,
      value: landingDemoIndexValue(scene, id),
    };
  });
}

export function landingDemoZones(
  scene: LandingDemoScene,
  indexId: VegetationIndexId,
): SpectralZone[] {
  const cells = partitionParcelZones(LANDING_DEMO_GEOMETRY);
  const base = landingDemoIndexValue(scene, indexId);
  const valuesByCellId = new Map<string, number | null>();
  cells.forEach((cell, index) => {
    const angle = (index / cells.length) * Math.PI * 2;
    valuesByCellId.set(cell.id, base + Math.sin(angle) * 0.12 + (index % 3) * 0.03);
  });
  return buildSpectralZones({ geometry: LANDING_DEMO_GEOMETRY, valuesByCellId });
}

export function landingDemoSparklinePoints(
  scenes: LandingDemoScene[],
  indexId: VegetationIndexId = "ndre",
): { points: string; values: number[] } {
  const values = scenes.map((scene) => landingDemoIndexValue(scene, indexId));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 0.01;
  const w = 120;
  const h = 28;
  const coords = values.map((value, index) => {
    const x = scenes.length === 1 ? w / 2 : (index / (scenes.length - 1)) * w;
    const y = h - ((value - min) / span) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return { points: coords.join(" "), values };
}

function rasterPatternValue(
  x: number,
  y: number,
  size: number,
  scene: LandingDemoScene,
  centerValue: number,
): number {
  const nx = x / size;
  const ny = y / size;
  const wave =
    Math.sin((nx * 14 + scene.seed) * Math.PI) * Math.cos((ny * 11 - scene.seed * 0.6) * Math.PI);
  const edge = Math.sin(nx * Math.PI) * Math.sin(ny * Math.PI);
  return centerValue + wave * 0.09 * edge + (nx - 0.5) * 0.04;
}

export function buildLandingDemoOverlay(
  scene: LandingDemoScene,
  indexId: VegetationIndexId = "ndre",
): ParcelSpectralOverlay {
  const legend = getSpectralLegend(indexId);
  const centerValue = landingDemoIndexValue(scene, indexId);
  const size = 192;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas unavailable");
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const value = clampLegendValue(
        rasterPatternValue(x, y, size, scene, centerValue),
        legend,
      );
      ctx.fillStyle = colorForLegendValue(value, legend);
      ctx.fillRect(x, y, 1, 1);
    }
  }

  return {
    kind: "spectral_overlay",
    indexId,
    label: VEGETATION_INDEX_CATALOG[indexId].label,
    value: centerValue,
    legend,
    grid: { type: "FeatureCollection", features: [] },
    raster: {
      imageDataUrl: canvas.toDataURL("image/png"),
      coordinates: LANDING_DEMO_RASTER_COORDINATES,
      width: size,
      height: size,
    },
    rendering: "sentinel_raster",
  };
}
