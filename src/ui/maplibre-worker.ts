import { setWorkerUrl } from "maplibre-gl";

let configured = false;

/**
 * MapLibre GL JS v6 ships the tile/GeoJSON worker as a separate ESM module.
 * Without an explicit worker URL, vector tiles and GeoJSON sources stay empty
 * (isStyleLoaded never settles; terra-draw layers never paint).
 */
export function ensureMapLibreWorker() {
  if (configured || typeof window === "undefined") {
    return;
  }
  configured = true;
  setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
}
