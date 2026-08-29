import type { ZoneCellDraft } from "@/domain/spectral/partition-zones";
import { fromArrayBuffer } from "geotiff";

export interface ZoneRasterBbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface AggregateZoneRasterInput {
  values: ArrayLike<number>;
  width: number;
  height: number;
  bbox: ZoneRasterBbox;
  cells: ZoneCellDraft[];
  /** Skip non-finite or this sentinel (default NaN-only). */
  nodata?: number;
}

function cellBbox(cell: ZoneCellDraft): ZoneRasterBbox {
  const ring =
    cell.geometry.type === "Polygon"
      ? cell.geometry.coordinates[0] ?? []
      : cell.geometry.coordinates[0]?.[0] ?? [];
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

/**
 * Average raster samples whose pixel centers fall in each fishnet cell rectangle.
 * Raster is assumed north-up, row 0 = maxLat (Process / GeoTIFF convention).
 */
export function aggregateZoneRaster(input: AggregateZoneRasterInput): Map<string, number | null> {
  const { values, width, height, bbox, cells } = input;
  const lngSpan = bbox.maxLng - bbox.minLng;
  const latSpan = bbox.maxLat - bbox.minLat;
  const sums = new Map<string, { sum: number; count: number }>();
  const boxes = cells.map((cell) => ({ id: cell.id, box: cellBbox(cell) }));

  for (const cell of cells) {
    sums.set(cell.id, { sum: 0, count: 0 });
  }

  if (!(width > 0) || !(height > 0) || !(lngSpan > 0) || !(latSpan > 0)) {
    return new Map(cells.map((c) => [c.id, null]));
  }

  for (let row = 0; row < height; row += 1) {
    const lat = bbox.maxLat - ((row + 0.5) / height) * latSpan;
    for (let col = 0; col < width; col += 1) {
      const idx = row * width + col;
      const value = values[idx];
      if (!Number.isFinite(value)) {
        continue;
      }
      if (input.nodata !== undefined && value === input.nodata) {
        continue;
      }
      const lng = bbox.minLng + ((col + 0.5) / width) * lngSpan;
      for (const { id, box } of boxes) {
        if (
          lng >= box.minLng &&
          lng <= box.maxLng &&
          lat >= box.minLat &&
          lat <= box.maxLat
        ) {
          const acc = sums.get(id)!;
          acc.sum += value;
          acc.count += 1;
          break;
        }
      }
    }
  }

  const out = new Map<string, number | null>();
  for (const cell of cells) {
    const acc = sums.get(cell.id)!;
    out.set(cell.id, acc.count > 0 ? acc.sum / acc.count : null);
  }
  return out;
}

/** Decode a Process API FLOAT32 GeoTIFF (single index band) into a typed grid. */
export async function decodeFloatTiff(
  buffer: ArrayBuffer,
): Promise<{ values: Float32Array; width: number; height: number } | null> {
  try {
    const tiff = await fromArrayBuffer(buffer);
    const image = await tiff.getImage();
    const width = image.getWidth();
    const height = image.getHeight();
    const rasters = await image.readRasters({ interleave: false });
    const band = Array.isArray(rasters) ? rasters[0] : rasters;
    if (!band || typeof band === "number") {
      return null;
    }
    const values =
      band instanceof Float32Array
        ? band
        : Float32Array.from(band as ArrayLike<number>);
    if (values.length < width * height) {
      return null;
    }
    return { values, width, height };
  } catch {
    return null;
  }
}
