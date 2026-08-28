import type { ExpressionSpecification, Map as MapLibreMap, GeoJSONSource } from "maplibre-gl";
import type { SpectralLegend } from "@/domain/spectral/types";
import type { ParcelSpectralOverlay } from "@/domain/spectral/types";

export const SPECTRAL_OVERLAY_SOURCE = "agro-spectral-overlay";
export const SPECTRAL_OVERLAY_LAYER = "agro-spectral-overlay-circles";

function colorExpression(legend: SpectralLegend): ExpressionSpecification {
  const expression: unknown[] = ["interpolate", ["linear"], ["get", "value"]];
  for (const stop of legend.stops) {
    expression.push(stop.value, stop.color);
  }
  return expression as ExpressionSpecification;
}

export function clearSpectralMapOverlay(map: MapLibreMap) {
  if (map.getLayer(SPECTRAL_OVERLAY_LAYER)) {
    map.removeLayer(SPECTRAL_OVERLAY_LAYER);
  }
  if (map.getSource(SPECTRAL_OVERLAY_SOURCE)) {
    map.removeSource(SPECTRAL_OVERLAY_SOURCE);
  }
}

export function applySpectralMapOverlay(
  map: MapLibreMap,
  overlay: ParcelSpectralOverlay,
  opacity: number,
) {
  const source = map.getSource(SPECTRAL_OVERLAY_SOURCE) as GeoJSONSource | undefined;
  if (source) {
    source.setData(overlay.grid);
  } else {
    map.addSource(SPECTRAL_OVERLAY_SOURCE, {
      type: "geojson",
      data: overlay.grid,
    });
    map.addLayer({
      id: SPECTRAL_OVERLAY_LAYER,
      type: "circle",
      source: SPECTRAL_OVERLAY_SOURCE,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 5, 14, 11, 16, 18],
        "circle-color": colorExpression(overlay.legend),
        "circle-opacity": opacity,
        "circle-blur": 0.55,
      },
    });
  }

  if (map.getLayer(SPECTRAL_OVERLAY_LAYER)) {
    map.setPaintProperty(SPECTRAL_OVERLAY_LAYER, "circle-color", colorExpression(overlay.legend));
    map.setPaintProperty(SPECTRAL_OVERLAY_LAYER, "circle-opacity", opacity);
  }
}
