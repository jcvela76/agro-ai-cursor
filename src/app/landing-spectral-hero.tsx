"use client";

import { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  buildLandingDemoOverlay,
  formatLandingSceneDate,
  LANDING_DEMO_CENTER,
  LANDING_DEMO_GEOMETRY,
  LANDING_DEMO_PARCEL_NAME,
  LANDING_DEMO_SCENES,
  LANDING_SPECTRAL_CROSSFADE_MS,
  LANDING_SPECTRAL_NEXT_READY_MS,
  LANDING_SPECTRAL_PLAY_MS,
  landingDemoZones,
} from "@/content/landing/spectral-demo";
import { getSpectralLegend } from "@/domain/spectral/overlay-legends";
import type { ParcelSpectralOverlay, VegetationIndexId } from "@/domain/spectral/types";
import { LandingSpectralPanel } from "@/ui/landing-spectral-panel";
import { MapChip } from "@/ui/map-chip";
import { ensureMapLibreWorker } from "@/ui/maplibre-worker";
import { Panel } from "@/ui/panel";
import {
  applyDualSpectralMapOverlay,
  applySpectralMapOverlay,
  applySpectralZoneOutlines,
  setDualSpectralOverlayBlend,
  setSpectralOverlayOpacity,
} from "@/ui/spectral-map-overlay";
import { fitLandingDemoParcel } from "./landing-hero-layout";
import styles from "./landing-spectral-hero.module.css";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const PARCELS_SOURCE = "landing-demo-parcels";
const PARCELS_FILL = "landing-demo-parcels-fill";
const PARCELS_LINE = "landing-demo-parcels-line";

function overlayCacheKey(indexId: VegetationIndexId, acquisitionDate: string) {
  return `${indexId}:${acquisitionDate}`;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function canCrossfade(
  earlier: ParcelSpectralOverlay | null,
  later: ParcelSpectralOverlay,
): earlier is ParcelSpectralOverlay {
  return Boolean(
    earlier &&
      earlier.rendering === "sentinel_raster" &&
      later.rendering === "sentinel_raster" &&
      earlier.raster &&
      later.raster,
  );
}

async function fetchLandingOverlay(
  indexId: VegetationIndexId,
  acquisitionDate: string,
): Promise<ParcelSpectralOverlay | null> {
  const params = new URLSearchParams({ index: indexId, acquiredAt: acquisitionDate });
  const res = await fetch(`/api/landing/spectral-overlay?${params}`, { cache: "force-cache" });
  const json = (await res.json()) as {
    status: string;
    data?: ParcelSpectralOverlay;
  };
  if (json.status !== "OK" || !json.data) {
    return null;
  }
  return json.data;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function parcelFeatureCollection() {
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: { parcelId: "parcel-9d29b6a2-3449-4659-8bf8-3f674153e2f5" },
        geometry: LANDING_DEMO_GEOMETRY,
      },
    ],
  };
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
  const shellRef = useRef<HTMLDivElement | null>(null);
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
  const [overlayRendering, setOverlayRendering] = useState<
    "sentinel_raster" | "synthetic_grid" | null
  >(null);
  const overlayCacheRef = useRef(new Map<string, ParcelSpectralOverlay>());
  const overlayOpacityRef = useRef(0.62);
  const displayedOverlayRef = useRef<ParcelSpectralOverlay | null>(null);
  const crossfadeFromRef = useRef<ParcelSpectralOverlay | null>(null);
  const crossfadeBlendRef = useRef(1);
  const crossfadeRafRef = useRef<number | undefined>(undefined);
  const sceneIndexRef = useRef(sceneIndex);
  const selectedIndexIdRef = useRef(selectedIndexId);
  sceneIndexRef.current = sceneIndex;
  selectedIndexIdRef.current = selectedIndexId;

  const scenes = LANDING_DEMO_SCENES;
  const activeScene = scenes[sceneIndex] ?? scenes[0];

  const cacheOverlay = (indexId: VegetationIndexId, acquisitionDate: string, overlay: ParcelSpectralOverlay) => {
    overlayCacheRef.current.set(overlayCacheKey(indexId, acquisitionDate), overlay);
  };

  const getCachedRaster = (indexId: VegetationIndexId, acquisitionDate: string) => {
    const hit = overlayCacheRef.current.get(overlayCacheKey(indexId, acquisitionDate));
    return hit?.rendering === "sentinel_raster" ? hit : null;
  };

  const ensureRasterOverlay = async (
    indexId: VegetationIndexId,
    acquisitionDate: string,
    timeoutMs: number,
  ): Promise<ParcelSpectralOverlay | null> => {
    const cached = getCachedRaster(indexId, acquisitionDate);
    if (cached) {
      return cached;
    }
    const startedAt = performance.now();
    while (performance.now() - startedAt < timeoutMs) {
      const overlay = await fetchLandingOverlay(indexId, acquisitionDate);
      if (overlay) {
        cacheOverlay(indexId, acquisitionDate, overlay);
        if (overlay.rendering === "sentinel_raster") {
          return overlay;
        }
      }
      await sleep(250);
      const retry = getCachedRaster(indexId, acquisitionDate);
      if (retry) {
        return retry;
      }
    }
    return overlayCacheRef.current.get(overlayCacheKey(indexId, acquisitionDate)) ?? null;
  };

  const refitMapToLayout = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }
    const copyRect = copySlotRef.current?.getBoundingClientRect();
    const panelRect = spectralSlotRef.current?.getBoundingClientRect();
    // Desktop rails may still be 0×0 on the first paint frame.
    if (
      window.innerWidth >= 1024 &&
      (copyRect == null ||
        panelRect == null ||
        copyRect.width < 40 ||
        panelRect.width < 40)
    ) {
      return false;
    }
    fitLandingDemoParcel(map, {
      shell: shellRef.current,
      copyRight: copyRect?.right,
      panelLeft: panelRect?.left,
      spectralHeight: panelRect?.height,
    });
    return true;
  };

  const scheduleLayoutRefits = () => {
    const delays = [0, 50, 150, 350, 800];
    const timers: number[] = [];
    for (const delay of delays) {
      timers.push(
        window.setTimeout(() => {
          refitMapToLayout();
        }, delay),
      );
    }
    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
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
    if (!mapReady) {
      return;
    }

    const cancelScheduled = scheduleLayoutRefits();

    const onResize = () => {
      window.clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = window.setTimeout(() => {
        refitMapToLayout();
      }, 150);
    };
    window.addEventListener("resize", onResize);

    const host = mapHostRef.current;
    const shell = shellRef.current;
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            window.clearTimeout(resizeTimerRef.current);
            resizeTimerRef.current = window.setTimeout(() => {
              refitMapToLayout();
            }, 50);
          })
        : null;
    if (observer && host) {
      observer.observe(host);
    }
    if (observer && shell) {
      observer.observe(shell);
    }
    if (observer && copySlotRef.current) {
      observer.observe(copySlotRef.current);
    }
    if (observer && spectralSlotRef.current) {
      observer.observe(spectralSlotRef.current);
    }

    return () => {
      cancelScheduled();
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeTimerRef.current);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- settle layout once map is ready
  }, [mapReady]);

  useEffect(() => {
    overlayOpacityRef.current = overlayOpacity;
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }
    if (crossfadeFromRef.current) {
      setDualSpectralOverlayBlend(map, overlayOpacity, crossfadeBlendRef.current);
      return;
    }
    setSpectralOverlayOpacity(map, overlayOpacity);
  }, [mapReady, overlayOpacity]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }

    let cancelled = false;

    const paintZones = () => {
      applySpectralZoneOutlines(
        map,
        landingDemoZones(activeScene, selectedIndexId),
        getSpectralLegend(selectedIndexId),
        null,
        PARCELS_LINE,
      );
    };

    const finishOnOverlay = (overlay: ParcelSpectralOverlay) => {
      if (cancelled) {
        return;
      }
      if (crossfadeRafRef.current !== undefined) {
        window.cancelAnimationFrame(crossfadeRafRef.current);
        crossfadeRafRef.current = undefined;
      }

      const previous = displayedOverlayRef.current;
      const opacity = overlayOpacityRef.current;

      if (canCrossfade(previous, overlay) && previous !== overlay) {
        crossfadeFromRef.current = previous;
        crossfadeBlendRef.current = 0;
        applyDualSpectralMapOverlay(map, previous, overlay, opacity, 0, PARCELS_LINE);
        paintZones();
        setOverlayRendering(overlay.rendering);

        const startedAt = performance.now();
        const tick = (now: number) => {
          if (cancelled) {
            return;
          }
          const progress = Math.min(1, (now - startedAt) / LANDING_SPECTRAL_CROSSFADE_MS);
          const blend = easeInOutCubic(progress);
          crossfadeBlendRef.current = blend;
          setDualSpectralOverlayBlend(map, overlayOpacityRef.current, blend);
          if (progress < 1) {
            crossfadeRafRef.current = window.requestAnimationFrame(tick);
            return;
          }
          crossfadeFromRef.current = null;
          crossfadeBlendRef.current = 1;
          crossfadeRafRef.current = undefined;
          applySpectralMapOverlay(map, overlay, overlayOpacityRef.current, PARCELS_LINE);
          paintZones();
          displayedOverlayRef.current = overlay;
        };
        crossfadeRafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      crossfadeFromRef.current = null;
      crossfadeBlendRef.current = 1;
      applySpectralMapOverlay(map, overlay, opacity, PARCELS_LINE);
      paintZones();
      displayedOverlayRef.current = overlay;
      setOverlayRendering(overlay.rendering);
    };

    const cacheKey = overlayCacheKey(selectedIndexId, activeScene.acquisitionDate);
    const cached = overlayCacheRef.current.get(cacheKey);
    const placeholder = buildLandingDemoOverlay(activeScene, selectedIndexId);

    if (cached) {
      finishOnOverlay(cached);
    } else {
      finishOnOverlay(placeholder);
      setOverlayRendering(null);
    }

    if (cached?.rendering === "sentinel_raster") {
      return () => {
        cancelled = true;
        if (crossfadeRafRef.current !== undefined) {
          window.cancelAnimationFrame(crossfadeRafRef.current);
          crossfadeRafRef.current = undefined;
        }
      };
    }

    void (async () => {
      const overlay = await fetchLandingOverlay(selectedIndexId, activeScene.acquisitionDate);
      if (cancelled || !overlay) {
        if (!cancelled && !cached) {
          setOverlayRendering("synthetic_grid");
        }
        return;
      }
      overlayCacheRef.current.set(cacheKey, overlay);
      finishOnOverlay(overlay);
    })();

    return () => {
      cancelled = true;
      if (crossfadeRafRef.current !== undefined) {
        window.cancelAnimationFrame(crossfadeRafRef.current);
        crossfadeRafRef.current = undefined;
      }
    };
  }, [activeScene, mapReady, selectedIndexId]);

  useEffect(() => {
    if (!mapReady) {
      return;
    }
    let cancelled = false;
    const order = [
      ...scenes.slice(sceneIndexRef.current),
      ...scenes.slice(0, sceneIndexRef.current),
    ];
    void (async () => {
      for (const scene of order) {
        if (cancelled) {
          return;
        }
        const indexId = selectedIndexIdRef.current;
        if (getCachedRaster(indexId, scene.acquisitionDate)) {
          continue;
        }
        const overlay = await fetchLandingOverlay(indexId, scene.acquisitionDate);
        if (cancelled) {
          return;
        }
        if (overlay) {
          cacheOverlay(indexId, scene.acquisitionDate, overlay);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mapReady, selectedIndexId]);

  useEffect(() => {
    if (!isPlaying || scenes.length < 2 || !mapReady) {
      return;
    }
    let cancelled = false;

    const run = async () => {
      while (!cancelled) {
        await sleep(LANDING_SPECTRAL_PLAY_MS);
        if (cancelled) {
          return;
        }
        const nextIndex = (sceneIndexRef.current + 1) % scenes.length;
        const nextScene = scenes[nextIndex]!;
        await ensureRasterOverlay(
          selectedIndexIdRef.current,
          nextScene.acquisitionDate,
          LANDING_SPECTRAL_NEXT_READY_MS,
        );
        if (cancelled) {
          return;
        }
        setSceneIndex(nextIndex);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isPlaying, mapReady, selectedIndexId]);

  return (
    <div ref={shellRef} className={styles.shell}>
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
              overlayRendering={overlayRendering}
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
