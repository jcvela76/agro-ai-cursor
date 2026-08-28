import type { ParcelGeometry } from "@/domain/parcel/types";
import type { SpectralLegend, VegetationIndexId } from "@/domain/spectral/types";
import { getSpectralLegend } from "@/domain/spectral/overlay-legends";

function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

const INDEX_SETUP: Record<
  VegetationIndexId,
  { bands: string[]; compute: string }
> = {
  ndre: {
    bands: ["B05", "B08", "dataMask"],
    compute: "var v=(s.B08-s.B05)/(s.B08+s.B05+1e-6);",
  },
  evi: {
    bands: ["B02", "B04", "B08", "dataMask"],
    compute: "var v=2.5*(s.B08-s.B04)/(s.B08+6*s.B04-7.5*s.B02+1+1e-6);",
  },
  savi: {
    bands: ["B04", "B08", "dataMask"],
    compute: "var L=0.5; var v=((s.B08-s.B04)/(s.B08+s.B04+L+1e-6))*(1+L);",
  },
  msavi: {
    bands: ["B04", "B08", "dataMask"],
    compute:
      "var v=0.5*(2*s.B08+1-Math.sqrt(Math.pow(2*s.B08+1,2)-8*(s.B08-s.B04)));",
  },
  gndvi: {
    bands: ["B03", "B08", "dataMask"],
    compute: "var v=(s.B08-s.B03)/(s.B08+s.B03+1e-6);",
  },
  ndwi: {
    bands: ["B03", "B08", "dataMask"],
    compute: "var v=(s.B03-s.B08)/(s.B03+s.B08+1e-6);",
  },
  ndmi: {
    bands: ["B08", "B11", "dataMask"],
    compute: "var v=(s.B08-s.B11)/(s.B08+s.B11+1e-6);",
  },
  nbr: {
    bands: ["B08", "B12", "dataMask"],
    compute: "var v=(s.B08-s.B12)/(s.B08+s.B12+1e-6);",
  },
};

/** Evalscript that paints a vegetation index with the product legend colors (RGBA). */
export function buildIndexRasterEvalscript(indexId: VegetationIndexId): string {
  const legend = getSpectralLegend(indexId);
  const setup = INDEX_SETUP[indexId];
  const stopsJs = legend.stops
    .map((stop) => {
      const [r, g, b] = hexToRgb01(stop.color);
      return `{v:${stop.value},r:${r.toFixed(4)},g:${g.toFixed(4)},b:${b.toFixed(4)}}`;
    })
    .join(",");

  return `//VERSION=3
function setup() {
  return {
    input: [{ bands: ${JSON.stringify(setup.bands)}, units: "REFLECTANCE" }],
    output: { bands: 4, sampleType: "AUTO" }
  };
}
var STOPS=[${stopsJs}];
var VMIN=${legend.min};
var VMAX=${legend.max};
function colorize(v) {
  if (v<=STOPS[0].v) return [STOPS[0].r,STOPS[0].g,STOPS[0].b];
  for (var i=1;i<STOPS.length;i++) {
    var a=STOPS[i-1], b=STOPS[i];
    if (v<=b.v) {
      var t=(v-a.v)/((b.v-a.v)||1e-6);
      return [a.r+(b.r-a.r)*t, a.g+(b.g-a.g)*t, a.b+(b.b-a.b)*t];
    }
  }
  var z=STOPS[STOPS.length-1];
  return [z.r,z.g,z.b];
}
function evaluatePixel(s) {
  ${setup.compute}
  var mask = s.dataMask;
  if (!(mask > 0)) return [0,0,0,0];
  if (v<VMIN) v=VMIN;
  if (v>VMAX) v=VMAX;
  var c=colorize(v);
  return [c[0],c[1],c[2],mask];
}
`;
}

export function geometryBbox(geometry: ParcelGeometry): {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
} {
  const ring =
    geometry.type === "Polygon"
      ? geometry.coordinates[0] ?? []
      : geometry.coordinates[0]?.[0] ?? [];
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of ring) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }
  return { minLng, minLat, maxLng, maxLat };
}

/** MapLibre image source corners: NW, NE, SE, SW. */
export function bboxImageCoordinates(bbox: {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}): [[number, number], [number, number], [number, number], [number, number]] {
  return [
    [bbox.minLng, bbox.maxLat],
    [bbox.maxLng, bbox.maxLat],
    [bbox.maxLng, bbox.minLat],
    [bbox.minLng, bbox.minLat],
  ];
}

export function rasterOutputSize(bbox: {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}, maxSide = 512): { width: number; height: number } {
  const w = Math.max(bbox.maxLng - bbox.minLng, 1e-9);
  const h = Math.max(bbox.maxLat - bbox.minLat, 1e-9);
  if (w >= h) {
    return { width: maxSide, height: Math.max(32, Math.round((maxSide * h) / w)) };
  }
  return { width: Math.max(32, Math.round((maxSide * w) / h)), height: maxSide };
}

export type { SpectralLegend };
