import type { ParcelGeometry, ParcelPolygon } from "@/domain/parcel/types";

function ringCentroid(ring: number[][]): { longitude: number; latitude: number } {
  // Shoelace centroid for a closed ring [lng, lat]
  let area = 0;
  let cx = 0;
  let cy = 0;
  const n = ring.length;
  if (n < 4) {
    const [lng, lat] = ring[0] ?? [0, 0];
    return { longitude: lng, latitude: lat };
  }

  for (let i = 0; i < n - 1; i += 1) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }

  area *= 0.5;
  if (Math.abs(area) < 1e-12) {
    const [lng, lat] = ring[0];
    return { longitude: lng, latitude: lat };
  }

  return {
    longitude: cx / (6 * area),
    latitude: cy / (6 * area),
  };
}

/** Planar shoelace in meters — fine for small field polygons and map labels. */
export function approximateAreaHectares(geometry: ParcelGeometry): number {
  const ring =
    geometry.type === "Polygon" ? geometry.coordinates[0] : geometry.coordinates[0]?.[0];
  if (!ring || ring.length < 4) {
    return 0;
  }

  const { latitude } = polygonCentroid(geometry);
  const latRad = (latitude * Math.PI) / 180;
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos(latRad);
  let areaM2 = 0;

  for (let i = 0; i < ring.length - 1; i += 1) {
    const [lng0, lat0] = ring[i];
    const [lng1, lat1] = ring[i + 1];
    const x0 = lng0 * mPerDegLng;
    const y0 = lat0 * mPerDegLat;
    const x1 = lng1 * mPerDegLng;
    const y1 = lat1 * mPerDegLat;
    areaM2 += x0 * y1 - x1 * y0;
  }

  return Math.abs(areaM2 / 2) / 10_000;
}

export function polygonCentroid(geometry: ParcelGeometry): {
  longitude: number;
  latitude: number;
} {
  if (geometry.type === "Polygon") {
    return ringCentroid(geometry.coordinates[0] ?? [[0, 0]]);
  }
  const first = geometry.coordinates[0]?.[0];
  return ringCentroid(first ?? [[0, 0]]);
}

export function isValidPolygon(geometry: unknown): geometry is ParcelPolygon {
  if (!geometry || typeof geometry !== "object") {
    return false;
  }
  const g = geometry as ParcelPolygon;
  if (g.type !== "Polygon" || !Array.isArray(g.coordinates) || g.coordinates.length < 1) {
    return false;
  }
  const ring = g.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4) {
    return false;
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
    return false;
  }
  return ring.every(
    (pos) =>
      Array.isArray(pos) &&
      pos.length >= 2 &&
      typeof pos[0] === "number" &&
      typeof pos[1] === "number",
  );
}

/** Small square around a point for synthetic seeds (~1.1 km). */
export function squareAround(
  longitude: number,
  latitude: number,
  delta = 0.01,
): ParcelPolygon {
  return {
    type: "Polygon",
    coordinates: [
      [
        [longitude - delta, latitude - delta],
        [longitude + delta, latitude - delta],
        [longitude + delta, latitude + delta],
        [longitude - delta, latitude + delta],
        [longitude - delta, latitude - delta],
      ],
    ],
  };
}
