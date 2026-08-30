"use client";

import { LngLatBounds, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  buildLandingDemoOverlay,
  formatLandingSceneDate,
  LANDING_DEMO_GEOMETRY,
  LANDING_DEMO_PARCEL_NAME,
  LANDING_DEMO_SCENES,
  landingDemoSparklinePoints,
} from "@/content/landing/spectral-demo";
import { getSpectralLegend } from "@/domain/spectral/overlay-legends";
import { SPECTRAL_TIMELINE_PLAY_MS } from "@/domain/spectral/timeline-scenes";
import { Badge } from "@/ui/badge";
import { MapChip } from "@/ui/map-chip";
import { ensureMapLibreWorker } from "@/ui/maplibre-worker";
import { applySpectralMapOverlay } from "@/ui/spectral-map-overlay";
import styles from "./landing-spectral-hero.module.css";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const PARCELS_SOURCE = "landing-demo-parcels";
const PARCELS_FILL = "landing-demo-parcels-fill";
const PARCELS_LINE = "landing-demo-parcels-line";

const INDEX_CHIPS = ["NDRE", "EVI", "NDWI", "SAVI"] as const;

function parcelFeatureCollection() {
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: { parcelId: "parcel-demo" },
        geometry: LANDING_DEMO_GEOMETRY,
      },
    ],
  };
}

function fitDemoParcel(map: MapLibreMap) {
  const bounds = new LngLatBounds();
  for (const [lng, lat] of LANDING_DEMO_GEOMETRY.coordinates[0]) {
    bounds.extend([lng, lat]);
  }
  map.fitBounds(bounds, { padding: { top: 96, bottom: 72, left: 360, right: 420 }, maxZoom: 15 });
}

function addParcelLayers(map: MapLibreMap) {
  map.addSource(PARCELS_SOURCE, {
    type: "geojson",
    data: parcelFeatureCollection(),
    promoteId: "parcelId",
  });
  map.addLayer({
    id: PARCELS_FILL,
    type: "fill",
    source: PARCELS_SOURCE,
    paint: {
      "fill-color": "#4F6F52",
      "fill-opacity": 0.38,
    },
  });
  map.addLayer({
    id: PARCELS_LINE,
    type: "line",
    source: PARCELS_SOURCE,
    paint: {
      "line-color": "#1C2A1F",
      "line-width": 2.5,
    },
  });
}

export function LandingSpectralHero({ children }: { children: ReactNode }) {
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  const scenes = LANDING_DEMO_SCENES;
  const activeScene = scenes[sceneIndex] ?? scenes[0];
  const legend = getSpectralLegend("ndre");
  const sparkline = useMemo(() => landingDemoSparklinePoints(scenes), [scenes]);

  useEffect(() => {
    if (!mapHostRef.current || mapRef.current) {
      return;
    }

    ensureMapLibreWorker();
    const map = new MapLibreMap({
      container: mapHostRef.current,
      style: STYLE_URL,
      center: [-77.05, -11.95],
      zoom: 14,
      attributionControl: false,
      interactive: true,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });

    mapRef.current = map;
    map.scrollZoom.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    map.touchZoomRotate.disableRotation();

    map.on("load", () => {
      addParcelLayers(map);
      fitDemoParcel(map);
      const overlay = buildLandingDemoOverlay(activeScene);
      applySpectralMapOverlay(map, overlay, 0.62, PARCELS_LINE);
      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map mounts once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }
    const overlay = buildLandingDemoOverlay(activeScene);
    applySpectralMapOverlay(map, overlay, 0.62, PARCELS_LINE);
  }, [activeScene, mapReady]);

  useEffect(() => {
    if (!isPlaying || scenes.length < 2) {
      return;
    }
    const timer = window.setInterval(() => {
      setSceneIndex((current) => (current + 1) % scenes.length);
    }, SPECTRAL_TIMELINE_PLAY_MS);
    return () => window.clearInterval(timer);
  }, [isPlaying, scenes.length]);

  return (
    <div className={styles.shell}>
      <div ref={mapHostRef} className={styles.mapHost} aria-hidden={!mapReady} />
      <div className={styles.mapVignette} />

      <div className={styles.mapChipSlot}>
        <MapChip label={`Escena · ${formatLandingSceneDate(activeScene.acquisitionDate)}`} variant="spectral" />
      </div>

      <div className={styles.grid}>
        <aside className={styles.spectralSlot} aria-label="Demostración Espectral">
          <div className={styles.spectralPanel}>
            <div className={styles.tabs} aria-hidden>
              <span className={styles.tab}>Clima</span>
              <span className={styles.tabActive}>Espectral</span>
              <span className={styles.tab}>Agente</span>
            </div>

            <p className={styles.panelMeta}>
              {LANDING_DEMO_PARCEL_NAME} · índices Sentinel-2 L2A anclados al polígono.
            </p>

            <div className={styles.badgeRow}>
              <Badge tone="fresh">PNG satélite</Badge>
              <Badge tone="unknown">ilustrativo</Badge>
            </div>

            <div className={styles.indexGrid} aria-hidden>
              {INDEX_CHIPS.map((chip) => (
                <span
                  key={chip}
                  className={chip === "NDRE" ? styles.indexChipActive : styles.indexChip}
                >
                  {chip}
                </span>
              ))}
            </div>

            <div>
              <p className={styles.legendTitle}>Leyenda NDRE</p>
              <div className={styles.legendBar}>
                {legend.stops.map((stop) => (
                  <span
                    key={stop.value}
                    className={styles.legendStop}
                    style={{ background: stop.color }}
                  />
                ))}
              </div>
              <div className={styles.legendLabels}>
                <span>{legend.minLabel}</span>
                <span>{legend.maxLabel}</span>
              </div>
            </div>

            <div>
              <p className={styles.historyTitle}>Historial · NDRE</p>
              <div className={styles.mapSceneBanner}>
                <span>Mapa: {activeScene.acquisitionDate} (histórico)</span>
              </div>
              {sparkline.points ? (
                <svg
                  className={styles.sparkline}
                  viewBox="0 0 120 28"
                  role="img"
                  aria-label="Tendencia NDRE ilustrativa"
                >
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    points={sparkline.points}
                  />
                </svg>
              ) : null}

              <div className={styles.timelineBlock}>
                <div className={styles.timelineControls}>
                  <button
                    type="button"
                    className={styles.timelinePlayButton}
                    onClick={() => setIsPlaying((playing) => !playing)}
                    aria-pressed={isPlaying}
                  >
                    {isPlaying ? "Pausa" : "Play"}
                  </button>
                  <input
                    type="range"
                    className={styles.timelineSlider}
                    min={0}
                    max={scenes.length - 1}
                    step={1}
                    value={sceneIndex}
                    onChange={(event) => {
                      setIsPlaying(false);
                      setSceneIndex(Number(event.target.value));
                    }}
                    aria-label="Escena espectral"
                  />
                </div>
                <div className={styles.timelineLabels}>
                  <span>{formatLandingSceneDate(scenes[0].acquisitionDate)}</span>
                  <span>{formatLandingSceneDate(scenes[scenes.length - 1].acquisitionDate)}</span>
                </div>
                <p className={styles.timelineCurrent}>
                  {formatLandingSceneDate(activeScene.acquisitionDate)} · fuente CDSE
                </p>
              </div>

              <div className={styles.ndreReadout}>
                <span>NDRE promedio</span>
                <span className={styles.ndreValue}>{activeScene.ndreMean.toFixed(2)}</span>
              </div>
            </div>

            <p className={styles.demoHint}>
              Demostración ilustrativa · no en tiempo real. El producto usa las mismas capas en
              `/app`.
            </p>
          </div>
        </aside>

        <div className={styles.spacer} aria-hidden />

        <div className={styles.copySlot}>{children}</div>
      </div>
    </div>
  );
}
