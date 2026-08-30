"use client";

import { LngLatBounds, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  buildLandingDemoOverlay,
  formatLandingSceneDate,
  LANDING_DEMO_CENTER,
  LANDING_DEMO_GEOMETRY,
  LANDING_DEMO_PARCEL_NAME,
  LANDING_DEMO_SCENES,
  landingDemoZones,
} from "@/content/landing/spectral-demo";
import { getSpectralLegend } from "@/domain/spectral/overlay-legends";
import { SPECTRAL_TIMELINE_PLAY_MS } from "@/domain/spectral/timeline-scenes";
import type { VegetationIndexId } from "@/domain/spectral/types";
import { LandingSpectralPanel } from "@/ui/landing-spectral-panel";
import { MapChip } from "@/ui/map-chip";
import { ensureMapLibreWorker } from "@/ui/maplibre-worker";
import { Panel } from "@/ui/panel";
import {
  applySpectralMapOverlay,
  applySpectralZoneOutlines,
} from "@/ui/spectral-map-overlay";
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
        properties: { parcelId: "parcel-demo-ica" },
        geometry: LANDING_DEMO_GEOMETRY,
      },
    ],
  };
}

function fitDemoParcel(
  map: MapLibreMap,
  layout?: { copyRight: number; panelLeft: number },
) {
  const bounds = new LngLatBounds();
  for (const [lng, lat] of LANDING_DEMO_GEOMETRY.coordinates[0]) {
    bounds.extend([lng, lat]);
  }

  const width = window.innerWidth;
  const maxZoom = width >= 1440 ? 17.25 : width >= 1280 ? 17 : width >= 1024 ? 16.5 : 15.5;

  const padding = layout
    ? {
        top: width >= 1024 ? 96 : 72,
        bottom: width >= 1024 ? 72 : 120,
        left: layout.copyRight + 16,
        right: width - layout.panelLeft + 16,
      }
    : {
        top: width >= 1024 ? 96 : 72,
        bottom: width >= 1024 ? 72 : 120,
        left: width >= 1440 ? 340 : width >= 1280 ? 320 : width >= 1024 ? 300 : 24,
        right: width >= 1440 ? 320 : width >= 1280 ? 300 : width >= 1024 ? 280 : 24,
      };

  map.fitBounds(bounds, { padding, maxZoom });
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
  const copySlotRef = useRef<HTMLDivElement | null>(null);
  const spectralSlotRef = useRef<HTMLElement | null>(null);
  const resizeTimerRef = useRef<number | undefined>(undefined);
  const [sceneIndex, setSceneIndex] = useState(LANDING_DEMO_SCENES.length - 1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [selectedIndexId, setSelectedIndexId] = useState<VegetationIndexId>("ndre");
  const [overlayOpacity, setOverlayOpacity] = useState(0.62);

  const scenes = LANDING_DEMO_SCENES;
  const activeScene = scenes[sceneIndex] ?? scenes[0];

  const refitMapToLayout = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }
    const copyRect = copySlotRef.current?.getBoundingClientRect();
    const panelRect = spectralSlotRef.current?.getBoundingClientRect();
    if (copyRect && panelRect && window.innerWidth >= 1024) {
      fitDemoParcel(map, { copyRight: copyRect.right, panelLeft: panelRect.left });
      return;
    }
    fitDemoParcel(map);
  };

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
      requestAnimationFrame(() => {
        refitMapToLayout();
      });
      applySpectralMapOverlay(
        map,
        buildLandingDemoOverlay(activeScene, selectedIndexId),
        overlayOpacity,
        PARCELS_LINE,
      );
      applySpectralZoneOutlines(
        map,
        landingDemoZones(activeScene, selectedIndexId),
        getSpectralLegend(selectedIndexId),
        null,
        PARCELS_LINE,
      );
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
    const onResize = () => {
      window.clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = window.setTimeout(() => {
        refitMapToLayout();
      }, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- layout measure only
  }, [mapReady]);

  useEffect(() => {
    if (!mapReady) {
      return;
    }
    refitMapToLayout();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refit after panels paint
  }, [mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }
    applySpectralMapOverlay(
      map,
      buildLandingDemoOverlay(activeScene, selectedIndexId),
      overlayOpacity,
      PARCELS_LINE,
    );
    applySpectralZoneOutlines(
      map,
      landingDemoZones(activeScene, selectedIndexId),
      getSpectralLegend(selectedIndexId),
      null,
      PARCELS_LINE,
    );
  }, [activeScene, mapReady, overlayOpacity, selectedIndexId]);

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
        <div ref={copySlotRef} className={styles.copySlot}>
          {children}
        </div>

        <aside
          ref={spectralSlotRef}
          className={styles.spectralSlot}
          aria-label="Panel Espectral demo"
        >
          <div className={styles.spectralTabs} aria-hidden>
            <span className={styles.spectralTabMuted}>Clima</span>
            <span className={styles.spectralTabActive}>Espectral</span>
            <span className={styles.spectralTabMuted}>Agente</span>
          </div>
          <Panel title={LANDING_DEMO_PARCEL_NAME} className={styles.spectralPanel} density="compact">
            <LandingSpectralPanel
              scene={activeScene}
              sceneIndex={sceneIndex}
              scenes={scenes}
              selectedIndexId={selectedIndexId}
              overlayOpacity={overlayOpacity}
              isPlaying={isPlaying}
              onIndexChange={setSelectedIndexId}
              onOpacityChange={setOverlayOpacity}
              onSceneIndexChange={setSceneIndex}
              onPlayingChange={setIsPlaying}
            />
          </Panel>
        </aside>
      </div>
    </div>
  );
}
