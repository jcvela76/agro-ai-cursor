import {
  approximateAreaHectares,
  demoParcelSquare,
} from "@/domain/parcel/geometry";
import {
  clampLegendValue,
  colorForLegendValue,
  getSpectralLegend,
} from "@/domain/spectral/overlay-legends";
import { bboxImageCoordinates } from "@/infrastructure/spectral/sentinel-hub-index-evalscript";
import type { ParcelGeometry } from "@/domain/parcel/types";
import type { ParcelSpectralOverlay } from "@/domain/spectral/types";

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

export function landingDemoSparklinePoints(
  scenes: LandingDemoScene[],
): { points: string; values: number[] } {
  const values = scenes.map((scene) => scene.ndreMean);
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
): number {
  const nx = x / size;
  const ny = y / size;
  const wave =
    Math.sin((nx * 14 + scene.seed) * Math.PI) * Math.cos((ny * 11 - scene.seed * 0.6) * Math.PI);
  const edge = Math.sin(nx * Math.PI) * Math.sin(ny * Math.PI);
  return scene.ndreMean + wave * 0.09 * edge + (nx - 0.5) * 0.04;
}

export function buildLandingDemoOverlay(scene: LandingDemoScene): ParcelSpectralOverlay {
  const legend = getSpectralLegend("ndre");
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
      const value = clampLegendValue(rasterPatternValue(x, y, size, scene), legend);
      ctx.fillStyle = colorForLegendValue(value, legend);
      ctx.fillRect(x, y, 1, 1);
    }
  }

  return {
    kind: "spectral_overlay",
    indexId: "ndre",
    label: "NDRE",
    value: scene.ndreMean,
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
