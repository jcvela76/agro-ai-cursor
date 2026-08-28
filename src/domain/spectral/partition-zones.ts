import type { ParcelGeometry } from "@/domain/parcel/types";

export const DEFAULT_ZONE_GRID = 3;
export const MAX_ZONE_CELLS = 9;

export interface ZoneCellDraft {
  id: string;
  row: number;
  col: number;
  geometry: ParcelGeometry;
  /** Approximate cell area in deg² (relative share only). */
  areaDeg2: number;
  centroid: { longitude: number; latitude: number };
}

function outerRing(geometry: ParcelGeometry): number[][] {
  if (geometry.type === "Polygon") {
    return geometry.coordinates[0] ?? [];
  }
  return geometry.coordinates[0]?.[0] ?? [];
}

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-12) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function ringBbox(ring: number[][]) {
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

function rectanglePolygon(
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number,
): ParcelGeometry {
  return {
    type: "Polygon",
    coordinates: [
      [
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat],
      ],
    ],
  };
}

/**
 * Fishnet over parcel bbox; keeps cells whose center lies inside the parcel ring.
 * Caps at MAX_ZONE_CELLS. If fewer than 2 cells qualify, returns one cell = full geometry.
 */
export function partitionParcelZones(
  geometry: ParcelGeometry,
  gridSize = DEFAULT_ZONE_GRID,
): ZoneCellDraft[] {
  const ring = outerRing(geometry);
  if (ring.length < 3) {
    return [];
  }

  const n = Math.min(Math.max(2, Math.floor(gridSize)), Math.floor(Math.sqrt(MAX_ZONE_CELLS)));
  const { minLng, minLat, maxLng, maxLat } = ringBbox(ring);
  const lngStep = (maxLng - minLng) / n;
  const latStep = (maxLat - minLat) / n;
  if (!(lngStep > 0) || !(latStep > 0)) {
    return [];
  }

  const cells: ZoneCellDraft[] = [];
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      const cellMinLng = minLng + col * lngStep;
      const cellMaxLng = minLng + (col + 1) * lngStep;
      const cellMinLat = minLat + row * latStep;
      const cellMaxLat = minLat + (row + 1) * latStep;
      const centroidLng = (cellMinLng + cellMaxLng) / 2;
      const centroidLat = (cellMinLat + cellMaxLat) / 2;
      if (!pointInRing(centroidLng, centroidLat, ring)) {
        continue;
      }
      cells.push({
        id: `z${row}${col}`,
        row,
        col,
        geometry: rectanglePolygon(cellMinLng, cellMinLat, cellMaxLng, cellMaxLat),
        areaDeg2: lngStep * latStep,
        centroid: { longitude: centroidLng, latitude: centroidLat },
      });
    }
  }

  if (cells.length >= 2) {
    return cells.slice(0, MAX_ZONE_CELLS);
  }

  const { minLng: a, minLat: b, maxLng: c, maxLat: d } = ringBbox(ring);
  return [
    {
      id: "z00",
      row: 0,
      col: 0,
      geometry,
      areaDeg2: Math.max((c - a) * (d - b), 1e-12),
      centroid: { longitude: (a + c) / 2, latitude: (b + d) / 2 },
    },
  ];
}

export function compassLabel(
  zone: { longitude: number; latitude: number },
  origin: { longitude: number; latitude: number },
): string {
  const dLng = zone.longitude - origin.longitude;
  const dLat = zone.latitude - origin.latitude;
  const absLng = Math.abs(dLng);
  const absLat = Math.abs(dLat);
  const eps = 1e-9;
  if (absLng < eps && absLat < eps) {
    return "centro";
  }
  const ns = absLat < absLng * 0.4 ? "" : dLat > 0 ? "N" : "S";
  const ew = absLng < absLat * 0.4 ? "" : dLng > 0 ? "E" : "O";
  return `${ns}${ew}` || "centro";
}
