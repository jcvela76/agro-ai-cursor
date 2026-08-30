import {
  clampLegendValue,
  colorForLegendValue,
  getSpectralLegend,
} from "@/domain/spectral/overlay-legends";
import { bboxImageCoordinates } from "@/infrastructure/spectral/sentinel-hub-index-evalscript";
import type { ParcelGeometry } from "@/domain/parcel/types";
import type { ParcelSpectralOverlay } from "@/domain/spectral/types";

export const LANDING_DEMO_PARCEL_NAME = "Parcela demo · 4.2 ha";

export const LANDING_DEMO_GEOMETRY: ParcelGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [-77.050995, -11.950995],
      [-77.049005, -11.950995],
      [-77.049005, -11.949005],
      [-77.050995, -11.949005],
      [-77.050995, -11.950995],
    ],
  ],
};

const DEMO_BBOX = {
  minLng: -77.050995,
  maxLng: -77.049005,
  minLat: -11.950995,
  maxLat: -11.949005,
};

export const LANDING_DEMO_RASTER_COORDINATES = bboxImageCoordinates(DEMO_BBOX);

export interface LandingDemoScene {
  acquisitionDate: string;
  ndreMean: number;
  seed: number;
}

export const LANDING_DEMO_SCENES: LandingDemoScene[] = [
  { acquisitionDate: "2026-08-08", ndreMean: 0.31, seed: 1.1 },
  { acquisitionDate: "2026-08-15", ndreMean: 0.35, seed: 2.4 },
  { acquisitionDate: "2026-08-22", ndreMean: 0.38, seed: 3.7 },
  { acquisitionDate: "2026-08-29", ndreMean: 0.41, seed: 4.2 },
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
  const size = 160;
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
