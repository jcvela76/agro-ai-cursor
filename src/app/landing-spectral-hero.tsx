"use client";

import { LngLatBounds, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  buildLandingDemoOverlay,
  formatLandingSceneDate,
  LANDING_DEMO_CENTER,
  LANDING_DEMO_GEOMETRY,
  LANDING_DEMO_PARCEL_NAME,
  LANDING_DEMO_SCENES,
  landingDemoSparklinePoints,
  ndreVigorLabel,
} from "@/content/landing/spectral-demo";
import { getSpectralLegend } from "@/domain/spectral/overlay-legends";
import { SPECTRAL_TIMELINE_PLAY_MS } from "@/domain/spectral/timeline-scenes";
import { Badge } from "@/ui/badge";
import { MapChip } from "@/ui/map-chip";
import { ensureMapLibreWorker } from "@/ui/maplibre-worker";
import { applySpectralMapOverlay } from "@/ui/spectral-map-overlay";
import spectralStyles from "@/ui/spectral-panel.module.css";
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
        properties: { parcelId: "parcel-demo-ica" },
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
  map.fitBounds(bounds, {
    padding: { top: 88, bottom: 64, left: 360, right: 400 },
    maxZoom: 14.5,
  });
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
      center: [LANDING_DEMO_CENTER.longitude, LANDING_DEMO_CENTER.latitude],
      zoom: 13,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });

    mapRef.current = map;
    map.scrollZoom.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();

    map.on("load", () => {
      addParcelLayers(map);
      fitDemoParcel(map);
      applySpectralMapOverlay(map, buildLandingDemoOverlay(activeScene), 0.62, PARCELS_LINE);
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
    applySpectralMapOverlay(map, buildLandingDemoOverlay(activeScene), 0.62, PARCELS_LINE);
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

      <div className={styles.mapChipSlot}>
        <MapChip
          label={`Escena · ${formatLandingSceneDate(activeScene.acquisitionDate)} · CDSE`}
          variant="spectral"
        />
      </div>

      <div className={styles.grid}>
        <aside className={styles.spectralSlot} aria-label="Panel Espectral demo">
          <div className={styles.productPanel}>
            <p className={spectralStyles.muted}>
              {LANDING_DEMO_PARCEL_NAME} · {LANDING_DEMO_CENTER.label}
            </p>
            <div className={styles.badgeRow}>
              <Badge tone="fresh">PNG satélite</Badge>
              <Badge tone="unknown">ilustrativo</Badge>
            </div>

            <div className={spectralStyles.indexGrid} aria-hidden>
              {INDEX_CHIPS.map((chip) => (
                <span
                  key={chip}
                  className={
                    chip === "NDRE" ? spectralStyles.indexChipActive : spectralStyles.indexChip
                  }
                >
                  {chip}
                </span>
              ))}
            </div>

            <div className={spectralStyles.legendBlock}>
              <p className={spectralStyles.legendTitle}>Leyenda NDRE</p>
              <div className={spectralStyles.legendBar}>
                {legend.stops.map((stop) => (
                  <span
                    key={stop.value}
                    className={spectralStyles.legendStop}
                    style={{ background: stop.color }}
                  />
                ))}
              </div>
              <div className={spectralStyles.legendLabels}>
                <span>{legend.minLabel}</span>
                <span>{legend.maxLabel}</span>
              </div>
            </div>

            <div className={spectralStyles.historyBlock}>
              <p className={spectralStyles.legendTitle}>Historial · NDRE</p>
              <div className={spectralStyles.mapSceneBanner}>
                <span>Mapa: {activeScene.acquisitionDate} (histórico)</span>
              </div>

              {sparkline.points ? (
                <svg
                  className={spectralStyles.sparkline}
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

              <div className={spectralStyles.timelineBlock}>
                <div className={spectralStyles.timelineControls}>
                  <button
                    type="button"
                    className={spectralStyles.timelinePlayButton}
                    onClick={() => setIsPlaying((playing) => !playing)}
                    aria-pressed={isPlaying}
                  >
                    {isPlaying ? "Pausa" : "Play"}
                  </button>
                  <input
                    type="range"
                    className={spectralStyles.timelineSlider}
                    min={0}
                    max={scenes.length - 1}
                    step={1}
                    value={sceneIndex}
                    onChange={(event) => {
                      setIsPlaying(false);
                      setSceneIndex(Number(event.target.value));
                    }}
                    aria-label="Línea de tiempo de capturas"
                  />
                </div>
                <div className={spectralStyles.timelineLabels}>
                  <span>{scenes[0].acquisitionDate}</span>
                  <span>{scenes[scenes.length - 1].acquisitionDate}</span>
                </div>
                <p className={spectralStyles.timelineCurrent}>
                  {activeScene.acquisitionDate} · NDRE {activeScene.ndreMean.toFixed(2)} ·{" "}
                  {ndreVigorLabel(activeScene.ndreMean)}
                </p>
              </div>
            </div>

            <p className={spectralStyles.zoneHint}>
              Demostración ilustrativa · mismas capas que en `/app` (Espectral).
            </p>
          </div>
        </aside>

        <div className={styles.copySlot}>{children}</div>
      </div>
    </div>
  );
}
