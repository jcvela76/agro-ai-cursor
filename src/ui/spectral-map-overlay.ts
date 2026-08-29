import type { Map as MapLibreMap, GeoJSONSource } from "maplibre-gl";
import type { ExpressionSpecification } from "maplibre-gl";
import type { FeatureCollection, Polygon, MultiPolygon } from "geojson";
import type { SpectralLegend, SpectralZone } from "@/domain/spectral/types";
import type { ParcelSpectralOverlay } from "@/domain/spectral/types";
import { colorForLegendValue } from "@/domain/spectral/overlay-legends";

export const SPECTRAL_OVERLAY_SOURCE = "agro-spectral-overlay";
export const SPECTRAL_OVERLAY_LAYER = "agro-spectral-overlay-circles";
export const SPECTRAL_RASTER_SOURCE = "agro-spectral-raster";
export const SPECTRAL_RASTER_LAYER = "agro-spectral-raster-layer";
export const SPECTRAL_RASTER_COMPARE_A_SOURCE = "agro-spectral-raster-compare-a";
export const SPECTRAL_RASTER_COMPARE_A_LAYER = "agro-spectral-raster-compare-a-layer";
export const SPECTRAL_RASTER_COMPARE_B_SOURCE = "agro-spectral-raster-compare-b";
export const SPECTRAL_RASTER_COMPARE_B_LAYER = "agro-spectral-raster-compare-b-layer";
export const SPECTRAL_ZONES_SOURCE = "agro-spectral-zones";
export const SPECTRAL_ZONES_FILL_LAYER = "agro-spectral-zones-fill";
export const SPECTRAL_ZONES_LINE_LAYER = "agro-spectral-zones-line";

function colorExpression(legend: SpectralLegend): ExpressionSpecification {
  const expression: unknown[] = ["interpolate", ["linear"], ["get", "value"]];
  for (const stop of legend.stops) {
    expression.push(stop.value, stop.color);
  }
  return expression as ExpressionSpecification;
}

export function clearSpectralMapOverlay(map: MapLibreMap) {
  clearSpectralIndexOverlay(map);
  clearSpectralZoneOutlines(map);
}

/** Clears index raster/grid only — keeps zone outlines. */
export function clearSpectralIndexOverlay(map: MapLibreMap) {
  if (map.getLayer(SPECTRAL_OVERLAY_LAYER)) {
    map.removeLayer(SPECTRAL_OVERLAY_LAYER);
  }
  if (map.getSource(SPECTRAL_OVERLAY_SOURCE)) {
    map.removeSource(SPECTRAL_OVERLAY_SOURCE);
  }
  if (map.getLayer(SPECTRAL_RASTER_LAYER)) {
    map.removeLayer(SPECTRAL_RASTER_LAYER);
  }
  if (map.getSource(SPECTRAL_RASTER_SOURCE)) {
    map.removeSource(SPECTRAL_RASTER_SOURCE);
  }
  clearSpectralCompareOverlays(map);
}

export function clearSpectralCompareOverlays(map: MapLibreMap) {
  if (map.getLayer(SPECTRAL_RASTER_COMPARE_A_LAYER)) {
    map.removeLayer(SPECTRAL_RASTER_COMPARE_A_LAYER);
  }
  if (map.getSource(SPECTRAL_RASTER_COMPARE_A_SOURCE)) {
    map.removeSource(SPECTRAL_RASTER_COMPARE_A_SOURCE);
  }
  if (map.getLayer(SPECTRAL_RASTER_COMPARE_B_LAYER)) {
    map.removeLayer(SPECTRAL_RASTER_COMPARE_B_LAYER);
  }
  if (map.getSource(SPECTRAL_RASTER_COMPARE_B_SOURCE)) {
    map.removeSource(SPECTRAL_RASTER_COMPARE_B_SOURCE);
  }
}

export function clearSpectralZoneOutlines(map: MapLibreMap) {
  if (map.getLayer(SPECTRAL_ZONES_LINE_LAYER)) {
    map.removeLayer(SPECTRAL_ZONES_LINE_LAYER);
  }
  if (map.getLayer(SPECTRAL_ZONES_FILL_LAYER)) {
    map.removeLayer(SPECTRAL_ZONES_FILL_LAYER);
  }
  if (map.getSource(SPECTRAL_ZONES_SOURCE)) {
    map.removeSource(SPECTRAL_ZONES_SOURCE);
  }
}

function zonesToGeoJson(
  zones: SpectralZone[],
  legend: SpectralLegend,
  activeZoneId: string | null,
): FeatureCollection<Polygon | MultiPolygon, { id: string; value: number | null; color: string; active: boolean }> {
  return {
    type: "FeatureCollection",
    features: zones.map((zone) => ({
      type: "Feature",
      properties: {
        id: zone.id,
        value: zone.value,
        color:
          zone.value === null
            ? "#94a3b8"
            : colorForLegendValue(zone.value, legend),
        active: zone.id === activeZoneId,
      },
      geometry: zone.geometry,
    })),
  };
}

export function applySpectralZoneOutlines(
  map: MapLibreMap,
  zones: SpectralZone[],
  legend: SpectralLegend,
  activeZoneId: string | null,
  beforeLayerId?: string,
) {
  const data = zonesToGeoJson(zones, legend, activeZoneId);
  const existing = map.getSource(SPECTRAL_ZONES_SOURCE) as GeoJSONSource | undefined;
  if (existing) {
    existing.setData(data);
  } else {
    map.addSource(SPECTRAL_ZONES_SOURCE, { type: "geojson", data });
    map.addLayer(
      {
        id: SPECTRAL_ZONES_FILL_LAYER,
        type: "fill",
        source: SPECTRAL_ZONES_SOURCE,
        paint: {
          "fill-color": ["get", "color"],
          // Outlines carry zone identity; keep fill near-zero so stretched PNG texture stays visible.
          "fill-opacity": [
            "case",
            ["get", "active"],
            0.06,
            0,
          ],
        },
      },
      beforeLayerId,
    );
    map.addLayer(
      {
        id: SPECTRAL_ZONES_LINE_LAYER,
        type: "line",
        source: SPECTRAL_ZONES_SOURCE,
        paint: {
          "line-color": [
            "case",
            ["get", "active"],
            "#0f172a",
            ["get", "color"],
          ],
          "line-width": [
            "case",
            ["get", "active"],
            2.5,
            1.25,
          ],
          "line-opacity": 0.9,
        },
      },
      beforeLayerId,
    );
  }

  if (map.getLayer(SPECTRAL_ZONES_FILL_LAYER)) {
    map.setPaintProperty(SPECTRAL_ZONES_FILL_LAYER, "fill-opacity", [
      "case",
      ["get", "active"],
      0.06,
      0,
    ]);
  }
  if (map.getLayer(SPECTRAL_ZONES_LINE_LAYER)) {
    map.setPaintProperty(SPECTRAL_ZONES_LINE_LAYER, "line-width", [
      "case",
      ["get", "active"],
      2.5,
      1.25,
    ]);
  }
}

function applyRasterOverlay(
  map: MapLibreMap,
  overlay: ParcelSpectralOverlay,
  opacity: number,
  beforeLayerId?: string,
) {
  const raster = overlay.raster;
  if (!raster) {
    return;
  }

  // Always remount image source — updateImage is flaky with large data-URL PNGs.
  if (map.getLayer(SPECTRAL_RASTER_LAYER)) {
    map.removeLayer(SPECTRAL_RASTER_LAYER);
  }
  if (map.getSource(SPECTRAL_RASTER_SOURCE)) {
    map.removeSource(SPECTRAL_RASTER_SOURCE);
  }
  map.addSource(SPECTRAL_RASTER_SOURCE, {
    type: "image",
    url: raster.imageDataUrl,
    coordinates: raster.coordinates,
  });
  map.addLayer(
    {
      id: SPECTRAL_RASTER_LAYER,
      type: "raster",
      source: SPECTRAL_RASTER_SOURCE,
      paint: {
        "raster-opacity": opacity * 0.85,
        "raster-fade-duration": 0,
      },
    },
    beforeLayerId,
  );
}

function applySyntheticGridOverlay(
  map: MapLibreMap,
  overlay: ParcelSpectralOverlay,
  opacity: number,
  beforeLayerId?: string,
) {
  const source = map.getSource(SPECTRAL_OVERLAY_SOURCE) as GeoJSONSource | undefined;
  if (source) {
    source.setData(overlay.grid);
  } else {
    map.addSource(SPECTRAL_OVERLAY_SOURCE, {
      type: "geojson",
      data: overlay.grid,
    });
    map.addLayer(
      {
        id: SPECTRAL_OVERLAY_LAYER,
        type: "circle",
        source: SPECTRAL_OVERLAY_SOURCE,
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            10,
            12,
            14,
            14,
            22,
            16,
            32,
          ],
          "circle-color": colorExpression(overlay.legend),
          "circle-opacity": opacity * 0.72,
          "circle-blur": 1,
        },
      },
      beforeLayerId,
    );
  }

  if (map.getLayer(SPECTRAL_OVERLAY_LAYER)) {
    map.setPaintProperty(SPECTRAL_OVERLAY_LAYER, "circle-color", colorExpression(overlay.legend));
    map.setPaintProperty(SPECTRAL_OVERLAY_LAYER, "circle-opacity", opacity * 0.72);
  }
}

export function applySpectralMapOverlay(
  map: MapLibreMap,
  overlay: ParcelSpectralOverlay,
  opacity: number,
  beforeLayerId?: string,
) {
  clearSpectralCompareOverlays(map);
  if (overlay.rendering === "sentinel_raster" && overlay.raster) {
    if (map.getLayer(SPECTRAL_OVERLAY_LAYER)) {
      map.removeLayer(SPECTRAL_OVERLAY_LAYER);
    }
    if (map.getSource(SPECTRAL_OVERLAY_SOURCE)) {
      map.removeSource(SPECTRAL_OVERLAY_SOURCE);
    }
    applyRasterOverlay(map, overlay, opacity, beforeLayerId);
    return;
  }

  if (map.getLayer(SPECTRAL_RASTER_LAYER)) {
    map.removeLayer(SPECTRAL_RASTER_LAYER);
  }
  if (map.getSource(SPECTRAL_RASTER_SOURCE)) {
    map.removeSource(SPECTRAL_RASTER_SOURCE);
  }
  applySyntheticGridOverlay(map, overlay, opacity, beforeLayerId);
}

export function setSpectralOverlayOpacity(map: MapLibreMap, opacity: number) {
  if (map.getLayer(SPECTRAL_RASTER_LAYER)) {
    map.setPaintProperty(SPECTRAL_RASTER_LAYER, "raster-opacity", opacity * 0.85);
  }
  if (map.getLayer(SPECTRAL_OVERLAY_LAYER)) {
    map.setPaintProperty(SPECTRAL_OVERLAY_LAYER, "circle-opacity", opacity * 0.72);
  }
}

function mountRasterLayer(
  map: MapLibreMap,
  sourceId: string,
  layerId: string,
  raster: NonNullable<ParcelSpectralOverlay["raster"]>,
  layerOpacity: number,
  beforeLayerId?: string,
) {
  if (map.getLayer(layerId)) {
    map.removeLayer(layerId);
  }
  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
  map.addSource(sourceId, {
    type: "image",
    url: raster.imageDataUrl,
    coordinates: raster.coordinates,
  });
  map.addLayer(
    {
      id: layerId,
      type: "raster",
      source: sourceId,
      paint: {
        "raster-opacity": layerOpacity,
        "raster-fade-duration": 0,
      },
    },
    beforeLayerId,
  );
}

/** Crossfade two CDSE PNG overlays (earlier = A, later = B). blend 0→A, 1→B. */
export function applyDualSpectralMapOverlay(
  map: MapLibreMap,
  overlayEarlier: ParcelSpectralOverlay,
  overlayLater: ParcelSpectralOverlay,
  opacity: number,
  blend: number,
  beforeLayerId?: string,
) {
  if (map.getLayer(SPECTRAL_OVERLAY_LAYER)) {
    map.removeLayer(SPECTRAL_OVERLAY_LAYER);
  }
  if (map.getSource(SPECTRAL_OVERLAY_SOURCE)) {
    map.removeSource(SPECTRAL_OVERLAY_SOURCE);
  }
  if (map.getLayer(SPECTRAL_RASTER_LAYER)) {
    map.removeLayer(SPECTRAL_RASTER_LAYER);
  }
  if (map.getSource(SPECTRAL_RASTER_SOURCE)) {
    map.removeSource(SPECTRAL_RASTER_SOURCE);
  }

  const clampedBlend = Math.min(1, Math.max(0, blend));
  const base = opacity * 0.85;
  const earlierRaster = overlayEarlier.raster;
  const laterRaster = overlayLater.raster;

  if (
    overlayEarlier.rendering === "sentinel_raster" &&
    overlayLater.rendering === "sentinel_raster" &&
    earlierRaster &&
    laterRaster
  ) {
    mountRasterLayer(
      map,
      SPECTRAL_RASTER_COMPARE_A_SOURCE,
      SPECTRAL_RASTER_COMPARE_A_LAYER,
      earlierRaster,
      base * (1 - clampedBlend),
      beforeLayerId,
    );
    mountRasterLayer(
      map,
      SPECTRAL_RASTER_COMPARE_B_SOURCE,
      SPECTRAL_RASTER_COMPARE_B_LAYER,
      laterRaster,
      base * clampedBlend,
      beforeLayerId,
    );
    return;
  }

  clearSpectralCompareOverlays(map);
  const fallback =
    overlayLater.rendering === "sentinel_raster" && laterRaster
      ? overlayLater
      : overlayEarlier.rendering === "sentinel_raster" && earlierRaster
        ? overlayEarlier
        : overlayLater;
  applySpectralMapOverlay(map, fallback, opacity, beforeLayerId);
}

export function setDualSpectralOverlayBlend(
  map: MapLibreMap,
  opacity: number,
  blend: number,
) {
  const clampedBlend = Math.min(1, Math.max(0, blend));
  const base = opacity * 0.85;
  if (map.getLayer(SPECTRAL_RASTER_COMPARE_A_LAYER)) {
    map.setPaintProperty(
      SPECTRAL_RASTER_COMPARE_A_LAYER,
      "raster-opacity",
      base * (1 - clampedBlend),
    );
  }
  if (map.getLayer(SPECTRAL_RASTER_COMPARE_B_LAYER)) {
    map.setPaintProperty(
      SPECTRAL_RASTER_COMPARE_B_LAYER,
      "raster-opacity",
      base * clampedBlend,
    );
  }
}
