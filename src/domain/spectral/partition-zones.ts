import type { ParcelGeometry } from "@/domain/parcel/types";

export const DEFAULT_ZONE_GRID = 3;
export const MAX_ZONE_CELLS = 9;
/** Bumped when fishnet geometry semantics change (invalidates Neon zone snapshots). */
export const ZONE_PARTITION_VERSION = "zones/v3";

export interface ZoneCellDraft {
  id: string;
  row: number;
  col: number;
  geometry: ParcelGeometry;
  /** Approximate cell area in deg² (relative share only). */
  areaDeg2: number;
  centroid: { longitude: number; latitude: number };
}

type LngLat = [number, number];

interface Aabb {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

function outerRing(geometry: ParcelGeometry): number[][] {
  if (geometry.type === "Polygon") {
    return geometry.coordinates[0] ?? [];
  }
  return geometry.coordinates[0]?.[0] ?? [];
}

function openRing(ring: number[][]): LngLat[] {
  if (ring.length < 2) {
    return [];
  }
  const pts = ring.map((p) => [p[0], p[1]] as LngLat);
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) {
    return pts.slice(0, -1);
  }
  return pts;
}

function closeRing(pts: LngLat[]): LngLat[] {
  if (pts.length === 0) {
    return [];
  }
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) {
    return pts;
  }
  return [...pts, [first[0], first[1]]];
}

function ringBbox(ring: number[][]): Aabb {
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

function polygonAreaDeg2(ring: LngLat[]): number {
  const pts = openRing(ring);
  if (pts.length < 3) {
    return 0;
  }
  let sum = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    sum += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  }
  return Math.abs(sum) / 2;
}

function ringCentroid(ring: LngLat[]): { longitude: number; latitude: number } {
  const pts = openRing(ring);
  if (pts.length === 0) {
    return { longitude: 0, latitude: 0 };
  }
  let area2 = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const cross = pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    area2 += cross;
    cx += (pts[j][0] + pts[i][0]) * cross;
    cy += (pts[j][1] + pts[i][1]) * cross;
  }
  if (Math.abs(area2) < 1e-18) {
    let lng = 0;
    let lat = 0;
    for (const p of pts) {
      lng += p[0];
      lat += p[1];
    }
    return { longitude: lng / pts.length, latitude: lat / pts.length };
  }
  return { longitude: cx / (3 * area2), latitude: cy / (3 * area2) };
}

/**
 * Sutherland–Hodgman: clip subject polygon by an axis-aligned rectangle.
 * Returns null when intersection is empty / degenerate.
 */
export function clipRingToAabb(ring: number[][], aabb: Aabb): LngLat[] | null {
  let output = openRing(ring);
  if (output.length < 3) {
    return null;
  }

  const edges: Array<{ inside: (p: LngLat) => boolean; intersect: (a: LngLat, b: LngLat) => LngLat }> = [
    {
      inside: (p) => p[0] >= aabb.minLng,
      intersect: (a, b) => {
        const t = (aabb.minLng - a[0]) / ((b[0] - a[0]) || 1e-18);
        return [aabb.minLng, a[1] + t * (b[1] - a[1])];
      },
    },
    {
      inside: (p) => p[0] <= aabb.maxLng,
      intersect: (a, b) => {
        const t = (aabb.maxLng - a[0]) / ((b[0] - a[0]) || 1e-18);
        return [aabb.maxLng, a[1] + t * (b[1] - a[1])];
      },
    },
    {
      inside: (p) => p[1] >= aabb.minLat,
      intersect: (a, b) => {
        const t = (aabb.minLat - a[1]) / ((b[1] - a[1]) || 1e-18);
        return [a[0] + t * (b[0] - a[0]), aabb.minLat];
      },
    },
    {
      inside: (p) => p[1] <= aabb.maxLat,
      intersect: (a, b) => {
        const t = (aabb.maxLat - a[1]) / ((b[1] - a[1]) || 1e-18);
        return [a[0] + t * (b[0] - a[0]), aabb.maxLat];
      },
    },
  ];

  for (const edge of edges) {
    if (output.length === 0) {
      return null;
    }
    const input = output;
    output = [];
    let prev = input[input.length - 1];
    for (const cur of input) {
      const curIn = edge.inside(cur);
      const prevIn = edge.inside(prev);
      if (curIn) {
        if (!prevIn) {
          output.push(edge.intersect(prev, cur));
        }
        output.push(cur);
      } else if (prevIn) {
        output.push(edge.intersect(prev, cur));
      }
      prev = cur;
    }
  }

  const closed = closeRing(output);
  if (openRing(closed).length < 3 || polygonAreaDeg2(closed) < 1e-16) {
    return null;
  }
  return closed;
}

function clippedPolygon(ring: LngLat[]): ParcelGeometry {
  return { type: "Polygon", coordinates: [ring] };
}

/**
 * Fishnet over parcel bbox; keeps cells that intersect the parcel and clips
 * each cell geometry to the parcel so the union covers the full polygon.
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
      const cellAabb: Aabb = {
        minLng: minLng + col * lngStep,
        maxLng: minLng + (col + 1) * lngStep,
        minLat: minLat + row * latStep,
        maxLat: minLat + (row + 1) * latStep,
      };
      const clipped = clipRingToAabb(ring, cellAabb);
      if (!clipped) {
        continue;
      }
      const areaDeg2 = polygonAreaDeg2(clipped);
      if (areaDeg2 < 1e-16) {
        continue;
      }
      const centroid = ringCentroid(clipped);
      cells.push({
        id: `z${row}${col}`,
        row,
        col,
        geometry: clippedPolygon(clipped),
        areaDeg2,
        centroid,
      });
    }
  }

  if (cells.length >= 2) {
    return cells.slice(0, MAX_ZONE_CELLS);
  }

  const bbox = ringBbox(ring);
  return [
    {
      id: "z00",
      row: 0,
      col: 0,
      geometry,
      areaDeg2: Math.max((bbox.maxLng - bbox.minLng) * (bbox.maxLat - bbox.minLat), 1e-12),
      centroid: {
        longitude: (bbox.minLng + bbox.maxLng) / 2,
        latitude: (bbox.minLat + bbox.maxLat) / 2,
      },
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
