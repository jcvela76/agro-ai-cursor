import { approximateAreaHectares } from "@/domain/parcel/geometry";
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

/** Neon ref: parcel-9d29b6a2-3449-4659-8bf8-3f674153e2f5 — Parcela Ica 2 (valle Tacama). */
export const LANDING_DEMO_PARCEL_ID = "parcel-9d29b6a2-3449-4659-8bf8-3f674153e2f5";

/** Autoplay hold per scene on the landing hero (product timeline stays at 1200ms). */
export const LANDING_SPECTRAL_PLAY_MS = 4000;

/** Crossfade duration between consecutive landing overlays. */
export const LANDING_SPECTRAL_CROSSFADE_MS = 1000;

/** Max wait for the next CDSE PNG before advancing without a soft fade. */
export const LANDING_SPECTRAL_NEXT_READY_MS = 8000;

export const LANDING_DEMO_CENTER = {
  label: "Ica · valle Tacama",
  longitude: -75.78006904844328,
  latitude: -14.017670134346865,
  timezone: "America/Lima",
} as const;

/** Polígono real de Parcela Ica 2 (workspace piloto, 2026-08-29). */
export const LANDING_DEMO_GEOMETRY: ParcelGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [-75.775073093, -14.014537814],
      [-75.777210159, -14.013331645],
      [-75.779311862, -14.012157911],
      [-75.781869777, -14.015703597],
      [-75.784895991, -14.020694767],
      [-75.780064348, -14.023277738],
      [-75.777645105, -14.017863307],
      [-75.775073093, -14.014537814],
    ],
  ],
};

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

export const LANDING_DEMO_PARCEL_NAME = "Parcela Ica 2";

export const LANDING_DEMO_PARCEL_META = `~${approximateAreaHectares(LANDING_DEMO_GEOMETRY).toFixed(1)} ha · ${LANDING_DEMO_CENTER.label}`;

export interface LandingDemoScene {
  acquisitionDate: string;
  ndreMean: number;
  seed: number;
  indices: Array<{ id: VegetationIndexId; value: number }>;
}

/** Escenas CDSE reales de Parcela Ica 2 (Neon, ago 2026). */
export const LANDING_DEMO_SCENES: LandingDemoScene[] = [
  {
    acquisitionDate: "2026-08-07",
    ndreMean: 0.02138732883195107,
    seed: 1.1,
    indices: [
      { id: "ndre", value: 0.02138732883195107 },
      { id: "evi", value: 0.5961245803640899 },
      { id: "savi", value: 0.03165035865237465 },
      { id: "msavi", value: 0.03363803756541639 },
      { id: "gndvi", value: 0.013267702497882984 },
      { id: "ndwi", value: -0.013267702497882984 },
      { id: "ndmi", value: 0.1006327945061006 },
      { id: "nbr", value: 0.19381099919671596 },
    ],
  },
  {
    acquisitionDate: "2026-08-12",
    ndreMean: 0.491356471246859,
    seed: 2.2,
    indices: [
      { id: "ndre", value: 0.491356471246859 },
      { id: "evi", value: 0.5715685546379518 },
      { id: "savi", value: 0.5045880810055472 },
      { id: "msavi", value: 0.5056100320358246 },
      { id: "gndvi", value: 0.6565710184653143 },
      { id: "ndwi", value: -0.6565710184653143 },
      { id: "ndmi", value: 0.2971774166030562 },
      { id: "nbr", value: 0.4782878816365624 },
    ],
  },
  {
    acquisitionDate: "2026-08-14",
    ndreMean: 0.06351667586329263,
    seed: 3.1,
    indices: [
      { id: "ndre", value: 0.06351667586329263 },
      { id: "evi", value: 0.4018874741837422 },
      { id: "savi", value: 0.09216450966602258 },
      { id: "msavi", value: 0.09414782430595414 },
      { id: "gndvi", value: 0.07809418220020442 },
      { id: "ndwi", value: -0.07809418220020442 },
      { id: "ndmi", value: 0.04023398784028775 },
      { id: "nbr", value: 0.11315017951051043 },
    ],
  },
  {
    acquisitionDate: "2026-08-17",
    ndreMean: 0.029128806277182232,
    seed: 3.6,
    indices: [
      { id: "ndre", value: 0.029128806277182232 },
      { id: "evi", value: 0.39175253762036727 },
      { id: "savi", value: 0.02912649889426488 },
      { id: "msavi", value: 0.0304942669097108 },
      { id: "gndvi", value: 0.008585326743369709 },
      { id: "ndwi", value: -0.008585326743369709 },
      { id: "ndmi", value: 0.20348002406185298 },
      { id: "nbr", value: 0.3951085749840907 },
    ],
  },
  {
    acquisitionDate: "2026-08-22",
    ndreMean: 0.0019445303442719455,
    seed: 4.0,
    indices: [
      { id: "ndre", value: 0.0019445303442719455 },
      { id: "evi", value: 0.026290236636621712 },
      { id: "savi", value: -0.0029789807152985756 },
      { id: "msavi", value: -0.003300017381431264 },
      { id: "gndvi", value: -0.024109636148927718 },
      { id: "ndwi", value: 0.024109636148927718 },
      { id: "ndmi", value: 0.18675102854469156 },
      { id: "nbr", value: 0.3157261530146259 },
    ],
  },
  {
    acquisitionDate: "2026-08-24",
    ndreMean: 0.48928326158767765,
    seed: 4.5,
    indices: [
      { id: "ndre", value: 0.48928326158767765 },
      { id: "evi", value: 0.5777832795507107 },
      { id: "savi", value: 0.48925697166871285 },
      { id: "msavi", value: 0.48717246342541715 },
      { id: "gndvi", value: 0.6225109417192386 },
      { id: "ndwi", value: -0.6225109417192386 },
      { id: "ndmi", value: 0.30034883555744823 },
      { id: "nbr", value: 0.4668547249927051 },
    ],
  },
  {
    acquisitionDate: "2026-08-27",
    ndreMean: -0.0003177099215950004,
    seed: 5.0,
    indices: [
      { id: "ndre", value: -0.0003177099215950004 },
      { id: "evi", value: 0.06624974511230183 },
      { id: "savi", value: -0.006911003664841738 },
      { id: "msavi", value: -0.007684507760123527 },
      { id: "gndvi", value: -0.026035583247607706 },
      { id: "ndwi", value: 0.026035583247607706 },
      { id: "ndmi", value: 0.18687525084621523 },
      { id: "nbr", value: 0.30169360736423306 },
    ],
  },
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
  if (value < 0.1) return "Estrés / bajo";
  if (value < 0.35) return "Vigor medio";
  return "Vigor alto";
}

export function findLandingDemoScene(acquisitionDate: string): LandingDemoScene | undefined {
  return LANDING_DEMO_SCENES.find((scene) => scene.acquisitionDate === acquisitionDate);
}

export function landingDemoAcquiredAt(scene: LandingDemoScene): string {
  return `${scene.acquisitionDate}T12:00:00Z`;
}

export function landingDemoIndexValue(
  scene: LandingDemoScene,
  indexId: VegetationIndexId,
): number {
  return scene.indices.find((item) => item.id === indexId)?.value ?? scene.ndreMean;
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
