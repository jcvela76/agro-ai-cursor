"use client";

import { LngLatBounds, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  buildLandingDemoOverlay,
  formatLandingSceneChip,
  formatLandingSceneDate,
  LANDING_DEMO_GEOMETRY,
  LANDING_DEMO_PARCEL_NAME,
  LANDING_DEMO_SCENES,
  ndreVigorLabel,
} from "@/content/landing/spectral-demo";
import { SPECTRAL_TIMELINE_PLAY_MS } from "@/domain/spectral/timeline-scenes";
import { ensureMapLibreWorker } from "@/ui/maplibre-worker";
import { applySpectralMapOverlay } from "@/ui/spectral-map-overlay";
import styles from "./landing-spectral-hero.module.css";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const PARCELS_SOURCE = "landing-demo-parcels";
const PARCELS_FILL = "landing-demo-parcels-fill";
const PARCELS_LINE = "landing-demo-parcels-line";

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
  map.fitBounds(bounds, { padding: 48, maxZoom: 15 });
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
      "fill-opacity": 0.22,
    },
  });
  map.addLayer({
    id: PARCELS_LINE,
    type: "line",
    source: PARCELS_SOURCE,
    paint: {
      "line-color": "#1C2A1F",
      "line-width": 2,
    },
  });
}

export function LandingSpectralHero({ children }: { children: ReactNode }) {
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [sceneIndex, setSceneIndex] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  const scenes = LANDING_DEMO_SCENES;
  const activeScene = scenes[sceneIndex] ?? scenes[0];

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
      interactive: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      addParcelLayers(map);
      fitDemoParcel(map);
      const overlay = buildLandingDemoOverlay(activeScene);
      applySpectralMapOverlay(map, overlay, 0.68, PARCELS_LINE);
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
    applySpectralMapOverlay(map, overlay, 0.68, PARCELS_LINE);
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
      <div className={styles.grid}>
        <div className={styles.copySlot}>{children}</div>

        <div className={styles.mockup} aria-label="Demostración mapa espectral">
          <div className={styles.mockupChrome}>
            <span className={`${styles.traffic} ${styles.trafficClose}`} aria-hidden />
            <span className={`${styles.traffic} ${styles.trafficMin}`} aria-hidden />
            <span className={`${styles.traffic} ${styles.trafficMax}`} aria-hidden />
            <span className={styles.urlBar}>geoagro.ai/parcela/demo</span>
            <span className={styles.plusBadge}>Campo · Plus</span>
          </div>

          <div className={styles.mapStage}>
            <div ref={mapHostRef} className={styles.mapHost} />

            <div className={styles.mapOverlayTopLeft}>
              {formatLandingSceneDate(activeScene.acquisitionDate)}
              <span> · Sentinel-2</span>
            </div>

            <div className={styles.mapOverlayTopRight}>
              <span className={styles.cdseDot} aria-hidden />
              fuente CDSE
            </div>

            <div className={styles.mapOverlayReadout}>
              <p className={styles.readoutLabel}>NDRE promedio</p>
              <p className={styles.readoutValue}>{activeScene.ndreMean.toFixed(2)}</p>
              <p className={styles.readoutTier}>{ndreVigorLabel(activeScene.ndreMean)}</p>
            </div>

            <div className={styles.mapOverlayBottomLeft}>
              <p className={styles.legendMiniLabel}>NDRE · Vigor</p>
              <div className={styles.legendMiniRow}>
                <span className={styles.legendMiniBar} aria-hidden />
                <span className={styles.legendMiniEnds}>Bajo → Alto</span>
              </div>
            </div>
          </div>

          <div className={styles.sceneRail} role="tablist" aria-label="Escenas Sentinel">
            {scenes.map((scene, index) => {
              const active = index === sceneIndex;
              return (
                <button
                  key={scene.acquisitionDate}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={active ? styles.sceneChipActive : styles.sceneChip}
                  onClick={() => {
                    setIsPlaying(false);
                    setSceneIndex(index);
                  }}
                >
                  <span
                    className={styles.sceneDot}
                    style={{ background: scene.chipColor }}
                    aria-hidden
                  />
                  {formatLandingSceneChip(scene.acquisitionDate)}
                </button>
              );
            })}
          </div>

          <div className={styles.mockupFooter}>
            <span>{LANDING_DEMO_PARCEL_NAME}</span>
            <span>Open-Meteo · NASA POWER · CDSE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
