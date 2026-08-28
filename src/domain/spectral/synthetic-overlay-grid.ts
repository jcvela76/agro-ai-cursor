import type { FeatureCollection, Point } from "geojson";
import type { ParcelGeometry } from "@/domain/parcel/types";
import { clampLegendValue } from "@/domain/spectral/overlay-legends";
import type { SpectralLegend } from "@/domain/spectral/types";

const GRID_SIZE = 42;

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

function bbox(ring: number[][]) {
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

function deterministicNoise(seed: string, i: number, j: number): number {
  let hash = 0;
  const key = `${seed}:${i}:${j}`;
  for (let k = 0; k < key.length; k += 1) {
    hash = (hash * 31 + key.charCodeAt(k)) >>> 0;
  }
  return (hash % 1000) / 1000;
}

export function buildSyntheticOverlayGrid(input: {
  geometry: ParcelGeometry;
  parcelId: string;
  meanValue: number;
  legend: SpectralLegend;
  /** Differentiates noise field per index so maps are not identical across chips. */
  indexId?: string;
}): FeatureCollection<Point, { value: number }> {
  const ring = outerRing(input.geometry);
  if (ring.length < 3 || input.meanValue === null || Number.isNaN(input.meanValue)) {
    return { type: "FeatureCollection", features: [] };
  }

  const { minLng, minLat, maxLng, maxLat } = bbox(ring);
  const lngStep = (maxLng - minLng) / (GRID_SIZE + 1);
  const latStep = (maxLat - minLat) / (GRID_SIZE + 1);
  const spread = Math.max(0.08, (input.legend.max - input.legend.min) * 0.22);
  const seed = input.indexId ? `${input.parcelId}:${input.indexId}` : input.parcelId;
  const features: FeatureCollection<Point, { value: number }>["features"] = [];

  for (let i = 1; i <= GRID_SIZE; i += 1) {
    for (let j = 1; j <= GRID_SIZE; j += 1) {
      const lng = minLng + lngStep * i;
      const lat = minLat + latStep * j;
      if (!pointInRing(lng, lat, ring)) {
        continue;
      }
      const noise = deterministicNoise(seed, i, j) - 0.5;
      const value = clampLegendValue(input.meanValue + noise * spread, input.legend);
      features.push({
        type: "Feature",
        properties: { value },
        geometry: { type: "Point", coordinates: [lng, lat] },
      });
    }
  }

  return { type: "FeatureCollection", features };
}
