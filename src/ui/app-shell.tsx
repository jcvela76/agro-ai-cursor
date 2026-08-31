"use client";

import { OrganizationSwitcher, UserButton, useAuth, useOrganization } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawRenderMode,
  TerraDrawSelectMode,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import type { Parcel, ParcelGeometry } from "@/domain/parcel/types";
import { approximateAreaHectares } from "@/domain/parcel/geometry";
import { planDisplayLabel } from "@/domain/billing/plan-display";
import type { ParcelSpectralOverlay, SpectralZone, VegetationIndexId } from "@/domain/spectral/types";
import { getSpectralLegend } from "@/domain/spectral/overlay-legends";
import { MapChip } from "@/ui/map-chip";
import { ParcelSelector } from "@/ui/parcel-selector";
import { SpectralParcelSummary } from "@/ui/spectral-parcel-summary";
import { AgentChatPanel } from "@/ui/agent-chat-panel";
import { Button } from "@/ui/button";
import { ensureMapLibreWorker } from "@/ui/maplibre-worker";
import { Panel } from "@/ui/panel";
import { ParcelProfilePanel } from "@/ui/parcel-profile-panel";
import { FieldLogPanel } from "@/ui/field-log-panel";
import { ReviewPanel } from "@/ui/review-panel";
import { TraceLotsPanel } from "@/ui/trace-lots-panel";
import { SpectralPanel } from "@/ui/spectral-panel";
import { trackPilotEvent } from "@/ui/pilot/track-pilot";
import { ShellTour } from "@/ui/shell-tour";
import {
  applySpectralMapOverlay,
  applyDualSpectralMapOverlay,
  applySpectralZoneOutlines,
  clearSpectralMapOverlay,
  clearSpectralIndexOverlay,
  clearSpectralZoneOutlines,
  setSpectralOverlayOpacity,
  setDualSpectralOverlayBlend,
  SPECTRAL_ZONES_FILL_LAYER,
} from "@/ui/spectral-map-overlay";
import { WeatherPanel } from "@/ui/weather-panel";
import styles from "./app-shell.module.css";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const PARCELS_SOURCE = "agro-parcels";
const PARCELS_FILL = "agro-parcels-fill";
const PARCELS_LINE = "agro-parcels-line";
const PARCEL_DETAIL_MAX_ZOOM = 16;

type DrawMode = "idle" | "draw" | "edit";
type SideTab = "weather" | "spectral" | "agent" | "profile" | "field" | "trace" | "review";

const SIDE_TABS: readonly SideTab[] = [
  "weather",
  "spectral",
  "agent",
  "profile",
  "field",
  "trace",
  "review",
];

function parseSideTab(raw: string | null | undefined): SideTab {
  if (raw && (SIDE_TABS as readonly string[]).includes(raw)) {
    return raw as SideTab;
  }
  return "weather";
}

function buildAppUrl(parcelId: string | null, tab: SideTab): string {
  const params = new URLSearchParams();
  if (parcelId) {
    params.set("parcel", parcelId);
  }
  if (tab !== "weather") {
    params.set("tab", tab);
  }
  const query = params.toString();
  return query ? `/app?${query}` : "/app";
}

function shortOrgDisplayName(name: string): string {
  return name.replace(/\s*\(sint[eé]tica\)\s*/gi, "").trim();
}

function extendBoundsWithGeometry(bounds: LngLatBounds, geometry: ParcelGeometry) {
  const rings =
    geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.flat();
  for (const ring of rings) {
    for (const coord of ring) {
      bounds.extend([coord[0], coord[1]]);
    }
  }
}

function boundsForParcels(parcels: Parcel[]): LngLatBounds | null {
  const bounds = new LngLatBounds();
  let hasPoint = false;
  for (const parcel of parcels) {
    if (parcel.geometry?.type === "Polygon") {
      extendBoundsWithGeometry(bounds, parcel.geometry);
      hasPoint = true;
    } else {
      bounds.extend([parcel.longitude, parcel.latitude]);
      hasPoint = true;
    }
  }
  return hasPoint ? bounds : null;
}

function flyToParcel(
  map: MapLibreMap,
  parcel: Parcel,
  options?: { padding?: number | { top: number; bottom: number; left: number; right: number } },
) {
  const padding = options?.padding ?? 72;
  if (parcel.geometry?.type === "Polygon") {
    const bounds = new LngLatBounds();
    extendBoundsWithGeometry(bounds, parcel.geometry);
    map.fitBounds(bounds, {
      padding,
      maxZoom: PARCEL_DETAIL_MAX_ZOOM,
      duration: 700,
      essential: true,
    });
    return;
  }
  map.flyTo({
    center: [parcel.longitude, parcel.latitude],
    zoom: 14,
    essential: true,
  });
}

function parcelsToFeatureCollection(parcels: Parcel[]) {
  return {
    type: "FeatureCollection" as const,
    features: parcels
      .filter((p) => p.geometry)
      .map((p) => ({
        type: "Feature" as const,
        id: p.id,
        properties: { parcelId: p.id, name: p.name },
        geometry: p.geometry as ParcelGeometry,
      })),
  };
}

function syncParcelLayers(
  map: MapLibreMap,
  parcels: Parcel[],
  options?: {
    hide?: boolean;
    excludeId?: string | null;
    selectedId?: string | null;
    spectralDimParcelId?: string | null;
  },
) {
  const visible = options?.hide
    ? []
    : options?.excludeId
      ? parcels.filter((p) => p.id !== options.excludeId)
      : parcels;
  const data = parcelsToFeatureCollection(visible);
  const source = map.getSource(PARCELS_SOURCE) as GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
  } else {
    map.addSource(PARCELS_SOURCE, {
      type: "geojson",
      data,
      promoteId: "parcelId",
    });
    map.addLayer({
      id: PARCELS_FILL,
      type: "fill",
      source: PARCELS_SOURCE,
      paint: {
        "fill-color": "#4F6F52",
        "fill-opacity": [
          "case",
          ["boolean", ["feature-state", "spectralDim"], false],
          0,
          ["case", ["boolean", ["feature-state", "selected"], false], 0.62, 0.38],
        ],
      },
    });
    map.addLayer({
      id: PARCELS_LINE,
      type: "line",
      source: PARCELS_SOURCE,
      paint: {
        "line-color": [
          "case",
          ["boolean", ["feature-state", "spectralDim"], false],
          "#FFFDF8",
          "#1C2A1F",
        ],
        "line-width": [
          "case",
          ["boolean", ["feature-state", "spectralDim"], false],
          2.5,
          ["case", ["boolean", ["feature-state", "selected"], false], 3.5, 2],
        ],
      },
    });
  }

  for (const parcel of visible) {
    if (!parcel.geometry) continue;
    try {
      map.setFeatureState(
        { source: PARCELS_SOURCE, id: parcel.id },
        {
          selected: parcel.id === options?.selectedId,
          spectralDim: parcel.id === options?.spectralDimParcelId,
        },
      );
    } catch {
      // Source may not be ready yet on first paint.
    }
  }
}

export function AppShell({
  initialParcelId,
  initialTab,
}: {
  initialParcelId: string | null;
  initialTab?: string | null;
}) {
  const router = useRouter();
  const { has } = useAuth();
  const { organization } = useOrganization();
  const isAdmin = has?.({ role: "org:admin" }) ?? false;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const spectralOverlayCacheRef = useRef(
    new Map<string, ParcelSpectralOverlay>(),
  );
  const spectralOpacityRef = useRef(0.62);
  const spectralZonesRef = useRef<SpectralZone[] | null>(null);
  const activeSpectralZoneIdRef = useRef<string | null>(null);
  const draftFeatureIdRef = useRef<string | number | null>(null);
  const editingParcelIdRef = useRef<string | null>(null);
  const drawModeRef = useRef<DrawMode>("idle");
  const selectParcelRef = useRef<
    (parcelId: string | null, options?: { keepTab?: boolean }) => void
  >(() => {});
  const setActiveSpectralZoneIdRef = useRef<(zoneId: string | null) => void>(() => {});
  const selectedIdRef = useRef<string | null>(initialParcelId);
  const sideTabRef = useRef<SideTab>(parseSideTab(initialTab));

  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [parcelQuota, setParcelQuota] = useState<{
    used: number;
    limit: number;
    remaining: number;
    blocked: boolean;
    maxHaPerParcel: number;
    planSlug: string;
  } | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialParcelId);
  const [drawMode, setDrawMode] = useState<DrawMode>("idle");
  const [sideTab, setSideTab] = useState<SideTab>(() => parseSideTab(initialTab));
  const [shellTourOpen, setShellTourOpen] = useState(false);
  const [draftName, setDraftName] = useState("Nueva parcela");
  const [draftGeometry, setDraftGeometry] = useState<ParcelGeometry | null>(null);
  const [detailName, setDetailName] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBillingHref, setActionBillingHref] = useState<string | null>(null);
  const [drawReady, setDrawReady] = useState(false);
  const [spectralIndexId, setSpectralIndexId] = useState<VegetationIndexId>("ndre");
  const [spectralOpacity, setSpectralOpacity] = useState(0.62);
  const [spectralZones, setSpectralZones] = useState<SpectralZone[] | null>(null);
  const [activeSpectralZoneId, setActiveSpectralZoneId] = useState<string | null>(null);
  const [spectralRendering, setSpectralRendering] = useState<
    "sentinel_raster" | "synthetic_grid" | null
  >(null);
  const [spectralFallbackReason, setSpectralFallbackReason] = useState<string | null>(null);
  const [spectralSceneHint, setSpectralSceneHint] = useState<{
    acquiredAt: string;
    means: Partial<Record<VegetationIndexId, number | null>>;
  } | null>(null);
  const [spectralCompareHint, setSpectralCompareHint] = useState<{
    earlier: {
      acquiredAt: string;
      means: Partial<Record<VegetationIndexId, number | null>>;
    };
    later: {
      acquiredAt: string;
      means: Partial<Record<VegetationIndexId, number | null>>;
    };
  } | null>(null);
  const [spectralCompareBlend, setSpectralCompareBlend] = useState(0.5);

  drawModeRef.current = drawMode;
  selectedIdRef.current = selectedId;
  sideTabRef.current = sideTab;
  spectralZonesRef.current = spectralZones;
  activeSpectralZoneIdRef.current = activeSpectralZoneId;

  const selectParcel = useCallback(
    (parcelId: string | null, options?: { keepTab?: boolean }) => {
      setSelectedId(parcelId);
      const nextTab = options?.keepTab ? sideTabRef.current : "weather";
      if (!options?.keepTab) {
        setSideTab("weather");
        setActiveSpectralZoneId(null);
      }
      router.replace(buildAppUrl(parcelId, nextTab), { scroll: false });
    },
    [router],
  );
  selectParcelRef.current = selectParcel;
  setActiveSpectralZoneIdRef.current = setActiveSpectralZoneId;

  const goToTab = useCallback(
    (tab: SideTab) => {
      setSideTab(tab);
      if (tab !== "spectral" && tab !== "field") {
        setActiveSpectralZoneId(null);
      }
      void trackPilotEvent(`${tab}.panel_open`, {
        parcelId: selectedIdRef.current,
      });
      router.replace(buildAppUrl(selectedIdRef.current, tab), { scroll: false });
    },
    [router],
  );

  const prefetchSpectralOverlay = useCallback(
    (hint: {
      acquiredAt: string;
      means: Partial<Record<VegetationIndexId, number | null>>;
    }) => {
      const parcelId = selectedIdRef.current;
      if (!parcelId || sideTabRef.current !== "spectral") {
        return;
      }
      const acquisitionDay = hint.acquiredAt.slice(0, 10);
      const cacheKey = `${parcelId}:${spectralIndexId}:${acquisitionDay}`;
      const existing = spectralOverlayCacheRef.current.get(cacheKey);
      if (existing?.rendering === "sentinel_raster") {
        return;
      }
      const parcelMean = hint.means[spectralIndexId];
      const params = new URLSearchParams({ index: spectralIndexId });
      params.set("acquiredAt", hint.acquiredAt);
      params.set(
        "parcelMean",
        parcelMean === null || parcelMean === undefined ? "null" : String(parcelMean),
      );
      void fetch(
        `/api/parcels/${encodeURIComponent(parcelId)}/spectral/overlay?${params}`,
        { cache: "no-store" },
      )
        .then((res) => res.json())
        .then((json: { status: string; data?: ParcelSpectralOverlay }) => {
          if (json.status !== "OK" || !json.data) {
            return;
          }
          if (json.data.rendering === "sentinel_raster") {
            spectralOverlayCacheRef.current.set(cacheKey, json.data);
          }
        })
        .catch(() => {
          // Prefetch is best-effort.
        });
    },
    [spectralIndexId],
  );

  const reloadParcels = useCallback(async () => {
    const res = await fetch("/api/parcels");
    const json = (await res.json()) as {
      status: string;
      data?: Parcel[];
      message?: string;
      quota?: {
        used: number;
        limit: number;
        remaining: number;
        blocked: boolean;
        maxHaPerParcel: number;
        planSlug: string;
      } | null;
    };
    if (!res.ok || json.status !== "OK" || !json.data) {
      setListError(json.message ?? "No se pudieron cargar las parcelas");
      return;
    }
    setParcels(json.data);
    setParcelQuota(json.quota ?? null);
    setListError(null);
  }, []);

  useEffect(() => {
    void reloadParcels();
  }, [reloadParcels]);

  useEffect(() => {
    if (parcels.length === 0) {
      return;
    }
    const hasSelection = selectedId && parcels.some((parcel) => parcel.id === selectedId);
    if (hasSelection) {
      return;
    }
    const fallback =
      initialParcelId && parcels.some((parcel) => parcel.id === initialParcelId)
        ? initialParcelId
        : parcels[0].id;
    selectParcel(fallback, { keepTab: true });
  }, [parcels, selectedId, initialParcelId, selectParcel]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId || drawMode !== "idle") {
      return;
    }
    const parcel = parcels.find((p) => p.id === selectedId);
    if (!parcel) {
      return;
    }
    const frame = () => flyToParcel(map, parcel);
    if (map.getStyle()) {
      frame();
    } else {
      map.once("style.load", frame);
    }
  }, [selectedId, parcels, drawMode]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    ensureMapLibreWorker();

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: STYLE_URL,
      center: [-77.05, -11.95],
      zoom: 8,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;

    const initDraw = () => {
      if (drawRef.current) {
        setDrawReady(true);
        return;
      }
      // Style JSON can be present while vector tiles keep isStyleLoaded()/loaded() false.
      // TerraDraw only needs the style object + map canvas, not every tile.
      if (!map.getStyle()) {
        return;
      }
      try {
        const draw = new TerraDraw({
          adapter: new TerraDrawMapLibreGLAdapter({ map }),
          modes: [
            new TerraDrawRenderMode({
              modeName: "render",
              styles: {
                polygonFillColor: "#4F6F52",
                polygonFillOpacity: 0.2,
                polygonOutlineColor: "#1C2A1F",
                polygonOutlineWidth: 2,
              },
            }),
            new TerraDrawPolygonMode({
              styles: {
                fillColor: "#4F6F52",
                fillOpacity: 0.35,
                outlineColor: "#1C2A1F",
                outlineWidth: 3,
                closingPointWidth: 14,
                closingPointColor: "#C45C26",
                closingPointOutlineWidth: 2,
                closingPointOutlineColor: "#FFFDF8",
              },
            }),
            new TerraDrawSelectMode({
              flags: {
                polygon: {
                  feature: {
                    draggable: true,
                    coordinates: {
                      midpoints: true,
                      draggable: true,
                      deletable: true,
                    },
                  },
                },
              },
              styles: {
                selectedPolygonColor: "#4F6F52",
                selectedPolygonFillOpacity: 0.35,
                selectedPolygonOutlineColor: "#1C2A1F",
                selectedPolygonOutlineWidth: 3,
                selectionPointWidth: 16,
                selectionPointColor: "#C45C26",
                selectionPointOutlineColor: "#FFFDF8",
                selectionPointOutlineWidth: 3,
                midPointColor: "#F3F0E8",
                midPointWidth: 12,
                midPointOutlineColor: "#1C2A1F",
                midPointOutlineWidth: 2,
              },
            }),
          ],
        });
        draw.start();
        draw.setMode("render");
        drawRef.current = draw;
        setDrawReady(true);

        draw.on("finish", (id) => {
          // Select/edit must not be treated as a new polygon finish.
          if (drawModeRef.current === "edit" || editingParcelIdRef.current) {
            const edited = draw.getSnapshotFeature(id);
            if (edited?.geometry.type === "Polygon") {
              setDraftGeometry(edited.geometry as ParcelGeometry);
            }
            return;
          }
          const feature = draw.getSnapshotFeature(id);
          if (!feature || feature.geometry.type !== "Polygon") {
            return;
          }
          draftFeatureIdRef.current = id;
          setDraftGeometry(feature.geometry as ParcelGeometry);
          setDraftName("Nueva parcela");
          setDrawMode("draw");
          draw.setMode("render");
        });

        draw.on("change", (ids) => {
          if (drawModeRef.current !== "edit") {
            return;
          }
          const featureId = draftFeatureIdRef.current;
          if (featureId == null || !ids.includes(featureId)) {
            return;
          }
          const feature = draw.getSnapshotFeature(featureId);
          if (feature?.geometry.type === "Polygon") {
            setDraftGeometry(feature.geometry as ParcelGeometry);
          }
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudo inicializar el dibujo en el mapa";
        setActionError(message);
      }
    };

    map.on("style.load", initDraw);
    map.on("load", initDraw);
    map.once("idle", initDraw);
    map.on("error", (event) => {
      // Tile/source noise is common; only surface hard style failures.
      const err = event.error;
      if (err && "status" in err && (err as { status?: number }).status === 404) {
        return;
      }
    });

    map.on("click", (event) => {
      if (drawModeRef.current !== "idle") {
        return;
      }
      // Prefer spectral zone hit so inspecting a quadrant doesn't reset the side tab.
      if (map.getLayer(SPECTRAL_ZONES_FILL_LAYER)) {
        const zoneHits = map.queryRenderedFeatures(event.point, {
          layers: [SPECTRAL_ZONES_FILL_LAYER],
        });
        const zoneId = zoneHits[0]?.properties?.id;
        if (typeof zoneId === "string") {
          setActiveSpectralZoneIdRef.current(zoneId);
          return;
        }
        // Click outside any zone clears the zone focus.
        setActiveSpectralZoneIdRef.current(null);
      }
      if (!map.getLayer(PARCELS_FILL)) {
        return;
      }
      const hits = map.queryRenderedFeatures(event.point, { layers: [PARCELS_FILL] });
      const parcelId = hits[0]?.properties?.parcelId;
      if (typeof parcelId === "string") {
        selectParcelRef.current(parcelId, { keepTab: true });
      }
    });

    map.on("mousemove", (event) => {
      if (drawModeRef.current !== "idle") {
        map.getCanvas().style.cursor = "";
        return;
      }
      if (map.getLayer(SPECTRAL_ZONES_FILL_LAYER)) {
        const zoneHits = map.queryRenderedFeatures(event.point, {
          layers: [SPECTRAL_ZONES_FILL_LAYER],
        });
        if (zoneHits.length > 0) {
          map.getCanvas().style.cursor = "pointer";
          return;
        }
      }
      if (!map.getLayer(PARCELS_FILL)) {
        map.getCanvas().style.cursor = "";
        return;
      }
      const hits = map.queryRenderedFeatures(event.point, { layers: [PARCELS_FILL] });
      map.getCanvas().style.cursor = hits.length > 0 ? "pointer" : "";
    });

    // Fallback if style.load already fired before listeners attached.
    const poll = window.setInterval(() => {
      if (drawRef.current) {
        window.clearInterval(poll);
        return;
      }
      initDraw();
    }, 250);
    const pollStop = window.setTimeout(() => window.clearInterval(poll), 8000);

    return () => {
      window.clearInterval(poll);
      window.clearTimeout(pollStop);
      drawRef.current?.stop();
      drawRef.current = null;
      setDrawReady(false);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const selected = parcels.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) {
      setDetailName(selected.name);
    }
  }, [selected]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const editingId = editingParcelIdRef.current;
    const apply = () =>
      syncParcelLayers(map, parcels, {
        hide: drawMode === "draw",
        excludeId: drawMode === "edit" ? editingId : null,
        selectedId: drawMode === "idle" ? selectedId : null,
        spectralDimParcelId:
          drawMode === "idle" && sideTab === "spectral" && selectedId ? selectedId : null,
      });
    if (map.getStyle()) {
      apply();
    } else {
      map.once("style.load", apply);
    }

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Markers only for parcels without polygon — polygons are the selection target.
    if (drawMode === "idle") {
      for (const parcel of parcels) {
        if (parcel.geometry?.type === "Polygon") {
          continue;
        }
        const el = document.createElement("button");
        el.type = "button";
        el.className =
          parcel.id === selectedId ? `${styles.marker} ${styles.markerSelected}` : styles.marker;
        el.setAttribute("aria-label", parcel.name);
        el.addEventListener("click", (event) => {
          event.stopPropagation();
          selectParcel(parcel.id, { keepTab: true });
        });

        const marker = new Marker({ element: el })
          .setLngLat([parcel.longitude, parcel.latitude])
          .addTo(map);
        markersRef.current.push(marker);
      }
    }

    if (selectedId || drawMode !== "idle") {
      return;
    }
    const bounds = boundsForParcels(parcels);
    if (!bounds) {
      return;
    }
    if (parcels.length === 1) {
      flyToParcel(map, parcels[0]);
    } else {
      map.fitBounds(bounds, { padding: 80, maxZoom: 11, duration: 0 });
    }
  }, [parcels, selectParcel, drawMode, selectedId, sideTab]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || drawMode !== "idle" || !selectedId || !selected?.geometry) {
      if (map) {
        clearSpectralMapOverlay(map);
      }
      spectralOverlayCacheRef.current.clear();
      setSpectralZones(null);
      setActiveSpectralZoneId(null);
      setSpectralRendering(null);
      setSpectralFallbackReason(null);
      setSpectralSceneHint(null);
      setSpectralCompareHint(null);
      return;
    }

    // Campo: keep fishnet for zone pin; drop PNG overlay/hints from Espectral.
    if (sideTab === "field") {
      clearSpectralIndexOverlay(map);
      spectralOverlayCacheRef.current.clear();
      setSpectralRendering(null);
      setSpectralFallbackReason(null);
      setSpectralSceneHint(null);
      setSpectralCompareHint(null);
      return;
    }

    if (sideTab !== "spectral") {
      clearSpectralMapOverlay(map);
      spectralOverlayCacheRef.current.clear();
      setSpectralZones(null);
      setActiveSpectralZoneId(null);
      setSpectralRendering(null);
      setSpectralFallbackReason(null);
      setSpectralSceneHint(null);
      setSpectralCompareHint(null);
      return;
    }

    if (spectralCompareHint) {
      return;
    }

    let cancelled = false;
    const acquiredAt = spectralSceneHint?.acquiredAt;
    const parcelMean = spectralSceneHint?.means[spectralIndexId];
    // Wait for indices hint so we skip a second Statistical call (timeouts under index switching).
    if (!acquiredAt) {
      setSpectralRendering(null);
      setSpectralFallbackReason(null);
      return;
    }
    const acquisitionDay = acquiredAt.slice(0, 10);
    const cacheKey = `${selectedId}:${spectralIndexId}:${acquisitionDay}`;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          setSpectralRendering(null);
          setSpectralFallbackReason(null);
          let overlay = spectralOverlayCacheRef.current.get(cacheKey);
          // Only reuse a live CDSE PNG. Synthetic fallback must not stick after a Process miss.
          if (overlay && overlay.rendering !== "sentinel_raster") {
            spectralOverlayCacheRef.current.delete(cacheKey);
            overlay = undefined;
          }
          if (!overlay) {
            const params = new URLSearchParams({ index: spectralIndexId });
            params.set("acquiredAt", acquiredAt);
            params.set(
              "parcelMean",
              parcelMean === null || parcelMean === undefined ? "null" : String(parcelMean),
            );
            const res = await fetch(
              `/api/parcels/${encodeURIComponent(selectedId)}/spectral/overlay?${params}`,
              { cache: "no-store" },
            );
            const json = (await res.json()) as {
              status: string;
              data?: Parameters<typeof applySpectralMapOverlay>[1];
            };
            if (cancelled || json.status !== "OK" || !json.data) {
              if (!cancelled) {
                clearSpectralIndexOverlay(map);
                setSpectralRendering(null);
                setSpectralFallbackReason(null);
              }
              return;
            }
            overlay = json.data;
            if (overlay.rendering === "sentinel_raster") {
              spectralOverlayCacheRef.current.set(cacheKey, overlay);
            }
          }

          if (cancelled || !overlay) return;
          setSpectralRendering(overlay.rendering);
          setSpectralFallbackReason(overlay.fallbackReason ?? null);
          const paint = () => {
            if (cancelled || !overlay) return;
            applySpectralMapOverlay(map, overlay, spectralOpacityRef.current, PARCELS_LINE);
            // Re-stack zone outlines above the PNG after raster mount.
            if (spectralZonesRef.current?.length) {
              applySpectralZoneOutlines(
                map,
                spectralZonesRef.current,
                getSpectralLegend(spectralIndexId),
                activeSpectralZoneIdRef.current,
                PARCELS_LINE,
              );
            }
          };
          if (map.isStyleLoaded()) {
            paint();
          } else {
            map.once("style.load", paint);
          }
        } catch {
          if (!cancelled) {
            clearSpectralIndexOverlay(map);
            setSpectralRendering(null);
            setSpectralFallbackReason(null);
          }
        }
      })();
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    drawMode,
    selectedId,
    selected?.geometry,
    sideTab,
    spectralIndexId,
    spectralSceneHint?.acquiredAt,
    spectralSceneHint?.means,
    spectralCompareHint,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (
      !map ||
      drawMode !== "idle" ||
      !selectedId ||
      !selected?.geometry ||
      sideTab !== "spectral" ||
      !spectralCompareHint
    ) {
      return;
    }

    let cancelled = false;
    const fetchOverlay = async (hint: {
      acquiredAt: string;
      means: Partial<Record<VegetationIndexId, number | null>>;
    }) => {
      const acquisitionDay = hint.acquiredAt.slice(0, 10);
      const cacheKey = `${selectedId}:${spectralIndexId}:${acquisitionDay}`;
      let overlay = spectralOverlayCacheRef.current.get(cacheKey);
      if (overlay && overlay.rendering !== "sentinel_raster") {
        spectralOverlayCacheRef.current.delete(cacheKey);
        overlay = undefined;
      }
      if (overlay) {
        return overlay;
      }
      const parcelMean = hint.means[spectralIndexId];
      const params = new URLSearchParams({ index: spectralIndexId });
      params.set("acquiredAt", hint.acquiredAt);
      params.set(
        "parcelMean",
        parcelMean === null || parcelMean === undefined ? "null" : String(parcelMean),
      );
      const res = await fetch(
        `/api/parcels/${encodeURIComponent(selectedId)}/spectral/overlay?${params}`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as {
        status: string;
        data?: ParcelSpectralOverlay;
      };
      if (json.status !== "OK" || !json.data) {
        return undefined;
      }
      if (json.data.rendering === "sentinel_raster") {
        spectralOverlayCacheRef.current.set(cacheKey, json.data);
      }
      return json.data;
    };

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          setSpectralRendering(null);
          setSpectralFallbackReason(null);
          const [earlierOverlay, laterOverlay] = await Promise.all([
            fetchOverlay(spectralCompareHint.earlier),
            fetchOverlay(spectralCompareHint.later),
          ]);
          if (cancelled || !earlierOverlay || !laterOverlay) {
            if (!cancelled) {
              clearSpectralIndexOverlay(map);
              setSpectralRendering(null);
              setSpectralFallbackReason(null);
            }
            return;
          }
          setSpectralRendering(
            earlierOverlay.rendering === "sentinel_raster" &&
              laterOverlay.rendering === "sentinel_raster"
              ? "sentinel_raster"
              : earlierOverlay.rendering,
          );
          setSpectralFallbackReason(
            earlierOverlay.fallbackReason ?? laterOverlay.fallbackReason ?? null,
          );
          const paint = () => {
            if (cancelled) {
              return;
            }
            applyDualSpectralMapOverlay(
              map,
              earlierOverlay,
              laterOverlay,
              spectralOpacityRef.current,
              spectralCompareBlend,
              PARCELS_LINE,
            );
            if (spectralZonesRef.current?.length) {
              applySpectralZoneOutlines(
                map,
                spectralZonesRef.current,
                getSpectralLegend(spectralIndexId),
                activeSpectralZoneIdRef.current,
                PARCELS_LINE,
              );
            }
          };
          if (map.isStyleLoaded()) {
            paint();
          } else {
            map.once("style.load", paint);
          }
        } catch {
          if (!cancelled) {
            clearSpectralIndexOverlay(map);
            setSpectralRendering(null);
            setSpectralFallbackReason(null);
          }
        }
      })();
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    drawMode,
    selectedId,
    selected?.geometry,
    sideTab,
    spectralIndexId,
    spectralCompareHint,
    spectralCompareBlend,
  ]);

  // Fishnet outlines for Espectral + Campo (zone pin).
  useEffect(() => {
    const map = mapRef.current;
    const showZones = sideTab === "spectral" || sideTab === "field";
    if (!map || !showZones || !spectralZones?.length) {
      if (map) {
        clearSpectralZoneOutlines(map);
      }
      return;
    }
    const legend = getSpectralLegend(spectralIndexId);
    const paint = () => {
      applySpectralZoneOutlines(map, spectralZones, legend, activeSpectralZoneId, PARCELS_LINE);
    };
    if (map.isStyleLoaded()) {
      paint();
    } else {
      map.once("style.load", paint);
    }
  }, [activeSpectralZoneId, sideTab, spectralIndexId, spectralZones]);

  // Cold Campo: load NDRE zones if fishnet not already in memory (e.g. after Espectral visit).
  const fieldZonesFetchRef = useRef<string | null>(null);
  useEffect(() => {
    if (sideTab !== "field" || !selectedId) {
      return;
    }
    if (spectralZones?.length) {
      fieldZonesFetchRef.current = selectedId;
      return;
    }
    if (fieldZonesFetchRef.current === selectedId) {
      return;
    }
    fieldZonesFetchRef.current = selectedId;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/parcels/${encodeURIComponent(selectedId)}/spectral/zones?index=ndre`,
          { cache: "no-store" },
        );
        const json = (await res.json()) as {
          status: string;
          data?: { zones?: SpectralZone[] };
        };
        if (cancelled || json.status !== "OK" || !json.data?.zones?.length) {
          return;
        }
        setSpectralZones(json.data.zones);
        setSpectralIndexId("ndre");
      } catch {
        // Manual zone text remains available.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sideTab, selectedId, spectralZones?.length]);

  useEffect(() => {
    spectralOpacityRef.current = spectralOpacity;
    const map = mapRef.current;
    if (!map) {
      return;
    }
    if (spectralCompareHint) {
      setDualSpectralOverlayBlend(map, spectralOpacity, spectralCompareBlend);
      return;
    }
    setSpectralOverlayOpacity(map, spectralOpacity);
  }, [spectralCompareBlend, spectralCompareHint, spectralOpacity]);

  const spectralActive =
    drawMode === "idle" && sideTab === "spectral" && Boolean(selected?.geometry);
  const mapChromeActive = drawMode === "idle";
  const fieldMapZoneLabel =
    sideTab === "field" && activeSpectralZoneId && spectralZones
      ? (spectralZones.find((z) => z.id === activeSpectralZoneId)?.label ?? null)
      : null;
  const summaryTitle = organization?.name
    ? shortOrgDisplayName(organization.name)
    : (selected?.name ?? "");
  const summaryAreaHectares =
    selected?.geometry?.type === "Polygon" ? approximateAreaHectares(selected.geometry) : 0;
  const liveAreaHectares = draftGeometry
    ? approximateAreaHectares(draftGeometry)
    : summaryAreaHectares;
  const areaOverPlanLimit =
    parcelQuota != null && liveAreaHectares > parcelQuota.maxHaPerParcel;
  const showBillingCta =
    Boolean(actionBillingHref) || Boolean(parcelQuota?.blocked) || areaOverPlanLimit;

  const clearActionError = () => {
    setActionError(null);
    setActionBillingHref(null);
  };

  const reportActionError = (message: string, billingHref?: string | null) => {
    setActionError(message);
    setActionBillingHref(billingHref ?? null);
  };

  const resetDrawState = (opts?: { restoreSelection?: boolean }) => {
    const editingId = editingParcelIdRef.current;
    drawRef.current?.clear();
    drawRef.current?.setMode("render");
    draftFeatureIdRef.current = null;
    editingParcelIdRef.current = null;
    setDraftGeometry(null);
    setDrawMode("idle");
    clearActionError();
    if (opts?.restoreSelection !== false && editingId) {
      selectParcel(editingId);
    }
  };

  const startDraw = () => {
    if (parcelQuota?.blocked) {
      reportActionError(
        `Cupo de parcelas agotado (${parcelQuota.used}/${parcelQuota.limit}). Mejora el plan en Facturación.`,
        "/app/billing",
      );
      return;
    }
    const draw = drawRef.current;
    if (!draw) {
      reportActionError("Espera a que el mapa termine de cargar e inténtalo de nuevo");
      return;
    }
    clearActionError();
    setDraftGeometry(null);
    selectParcel(null);
    editingParcelIdRef.current = null;
    draftFeatureIdRef.current = null;
    draw.clear();
    draw.setMode("polygon");
    setDrawMode("draw");
  };

  const saveDraft = async () => {
    if (!draftGeometry) {
      reportActionError("Dibuja un polígono cerrado primero");
      return;
    }
    const name = draftName.trim();
    if (!name) {
      reportActionError("El nombre es obligatorio");
      return;
    }
    setBusy(true);
    clearActionError();
    try {
      const res = await fetch("/api/parcels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, geometry: draftGeometry }),
      });
      const json = (await res.json()) as {
        status: string;
        data?: Parcel;
        message?: string;
        billingHref?: string;
      };
      if (!res.ok || json.status !== "OK" || !json.data) {
        reportActionError(
          json.message ?? "No se pudo guardar",
          json.billingHref ?? null,
        );
        return;
      }
      resetDrawState({ restoreSelection: false });
      await reloadParcels();
      // New parcel → Clima as onboarding entry; map re-select keeps the current tab.
      selectParcel(json.data.id);
    } catch {
      reportActionError("No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  const startEditSelected = () => {
    const draw = drawRef.current;
    const map = mapRef.current;
    if (!draw || !selected?.geometry || selected.geometry.type !== "Polygon") {
      reportActionError("Esta parcela no tiene polígono editable");
      return;
    }
    if (!drawReady) {
      reportActionError("Espera a que el mapa termine de cargar e inténtalo de nuevo");
      return;
    }
    const geometry = selected.geometry;
    const parcelId = selected.id;
    clearActionError();
    editingParcelIdRef.current = parcelId;
    setDrawMode("edit");
    setDraftName(selected.name);
    setDraftGeometry(geometry);

    let loaded = false;
    const loadEditableFeature = () => {
      if (loaded || editingParcelIdRef.current !== parcelId) {
        return;
      }
      loaded = true;
      draw.clear();
      const featureId = draw.getFeatureId();
      const validation = draw.addFeatures([
        {
          type: "Feature",
          id: featureId,
          geometry,
          properties: { mode: "polygon" },
        },
      ]);
      if (validation.some((v) => !v.valid)) {
        reportActionError("No se pudo cargar la geometría para editar");
        resetDrawState();
        return;
      }
      draftFeatureIdRef.current = featureId;
      draw.setMode("select");
      draw.selectFeature(featureId);
    };

    // Zoom first so vertex handles are large enough to grab, then mount edit feature.
    if (map) {
      flyToParcel(map, selected, {
        padding: { top: 96, bottom: 96, left: 96, right: 420 },
      });
      map.once("moveend", loadEditableFeature);
      // Fallback if already at target / moveend skipped.
      window.setTimeout(loadEditableFeature, 800);
    } else {
      loadEditableFeature();
    }
  };

  const saveEdit = async () => {
    const draw = drawRef.current;
    const featureId = draftFeatureIdRef.current;
    const editingId = editingParcelIdRef.current;
    if (!draw || featureId == null || !editingId) {
      reportActionError("No hay geometría para guardar");
      return;
    }
    const feature = draw.getSnapshotFeature(featureId);
    if (!feature || feature.geometry.type !== "Polygon") {
      reportActionError("Geometría inválida");
      return;
    }
    const name = draftName.trim();
    if (!name) {
      reportActionError("El nombre es obligatorio");
      return;
    }
    setBusy(true);
    clearActionError();
    try {
      const res = await fetch(`/api/parcels/${encodeURIComponent(editingId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, geometry: feature.geometry }),
      });
      const json = (await res.json()) as {
        status: string;
        data?: Parcel;
        message?: string;
        billingHref?: string;
      };
      if (!res.ok || json.status !== "OK" || !json.data) {
        reportActionError(
          json.message ?? "No se pudo actualizar",
          json.billingHref ?? null,
        );
        return;
      }
      resetDrawState({ restoreSelection: false });
      await reloadParcels();
      selectParcel(json.data.id, { keepTab: true });
    } catch {
      reportActionError("No se pudo actualizar");
    } finally {
      setBusy(false);
    }
  };

  const saveDetailName = async () => {
    if (!selectedId) return;
    const name = detailName.trim();
    if (!name) {
      setActionError("El nombre es obligatorio");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/parcels/${encodeURIComponent(selectedId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = (await res.json()) as { status: string; data?: Parcel; message?: string };
      if (!res.ok || json.status !== "OK" || !json.data) {
        setActionError(json.message ?? "No se pudo guardar el nombre");
        return;
      }
      await reloadParcels();
    } catch {
      setActionError("No se pudo guardar el nombre");
    } finally {
      setBusy(false);
    }
  };

  const deleteSelected = async () => {
    if (!selectedId) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/parcels/${encodeURIComponent(selectedId)}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { status: string; message?: string };
      if (!res.ok || json.status !== "OK") {
        setActionError(json.message ?? "No se pudo eliminar");
        return;
      }
      selectParcel(null);
      await reloadParcels();
    } catch {
      setActionError("No se pudo eliminar");
    } finally {
      setBusy(false);
    }
  };

  const mapChromeStack = (
    <div className={styles.chromeStack}>
      <header className={`${styles.chrome} ${styles.chromeSpectralRow}`}>
        <div className={styles.chromeLeft}>
          <span className={styles.brandMark} aria-hidden />
          <p className={styles.brand}>Agro AI</p>
          <OrganizationSwitcher
            hidePersonal
            afterSelectOrganizationUrl="/app"
            appearance={{
              elements: {
                rootBox: styles.orgSwitcherInline,
                organizationSwitcherTrigger: styles.orgSwitcherTrigger,
              },
            }}
          />
          {parcelQuota ? (
            <div
              className={
                parcelQuota.blocked || areaOverPlanLimit
                  ? styles.parcelQuotaBarBlocked
                  : styles.parcelQuotaBar
              }
              role="status"
              aria-live="polite"
              title={`Plan ${parcelQuota.planSlug}`}
            >
              <span className={styles.parcelQuotaPlan}>
                {planDisplayLabel(parcelQuota.planSlug)}
              </span>
              <span className={styles.parcelQuotaSep} aria-hidden>
                ·
              </span>
              <span>
                Parcelas {parcelQuota.used}/{parcelQuota.limit}
              </span>
              <span className={styles.parcelQuotaSep} aria-hidden>
                ·
              </span>
              <span>Máx {parcelQuota.maxHaPerParcel} ha</span>
              {selected?.geometry?.type === "Polygon" ? (
                <>
                  <span className={styles.parcelQuotaSep} aria-hidden>
                    ·
                  </span>
                  <span className={areaOverPlanLimit ? styles.parcelQuotaOver : undefined}>
                    Selección {summaryAreaHectares.toFixed(1)} ha
                  </span>
                </>
              ) : null}
              {showBillingCta ? (
                <Link
                  className={styles.parcelQuotaUpgrade}
                  href={actionBillingHref ?? "/app/billing"}
                >
                  Mejorar plan
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className={styles.chromeRight}>
          <button
            type="button"
            className={styles.adminLink}
            onClick={() => setShellTourOpen(true)}
          >
            Guía
          </button>
          <Link className={styles.adminLink} href="/app/piloto">
            Piloto
          </Link>
          {isAdmin ? (
            <Link className={styles.adminLink} href="/app/admin">
              Admin
            </Link>
          ) : null}
          <Button
            type="button"
            variant="primary"
            onClick={startDraw}
            disabled={busy || !drawReady || Boolean(parcelQuota?.blocked)}
            className={styles.chromeAction}
            title={
              parcelQuota
                ? `Parcelas ${parcelQuota.used}/${parcelQuota.limit} · máx ${parcelQuota.maxHaPerParcel} ha`
                : undefined
            }
          >
            + Nueva parcela
          </Button>
          <UserButton />
        </div>
      </header>
      <div className={styles.mapSubChrome}>
        <div className={styles.mapSubChromeLeft}>
          <ParcelSelector
            parcels={parcels}
            selectedId={selectedId}
            onSelect={(parcelId) => selectParcel(parcelId, { keepTab: true })}
            disabled={busy || parcels.length === 0}
          />
          {spectralActive ? (
            <MapChip label={`${spectralIndexId.toUpperCase()} activo`} variant="spectral" />
          ) : null}
        </div>
        {selected ? (
          <SpectralParcelSummary title={summaryTitle} areaHectares={summaryAreaHectares} />
        ) : null}
      </div>
    </div>
  );

  return (
    <div className={styles.shell}>
      <div ref={mapContainerRef} className={styles.map} />
      <ShellTour
        open={shellTourOpen}
        onOpenChange={setShellTourOpen}
        autoStart
      />

      {mapChromeActive ? (
        mapChromeStack
      ) : (
        <header className={styles.chrome}>
          <div className={styles.chromeLeft}>
            <span className={styles.brandMark} aria-hidden />
            <p className={styles.brand}>Agro AI</p>
            {parcelQuota ? (
              <div
                className={
                  parcelQuota.blocked || areaOverPlanLimit || actionBillingHref
                    ? styles.parcelQuotaBarBlocked
                    : styles.parcelQuotaBar
                }
                role="status"
                aria-live="polite"
                title={`Plan ${parcelQuota.planSlug}`}
              >
                <span className={styles.parcelQuotaPlan}>
                  {planDisplayLabel(parcelQuota.planSlug)}
                </span>
                <span className={styles.parcelQuotaSep} aria-hidden>
                  ·
                </span>
                <span>
                  Parcelas {parcelQuota.used}/{parcelQuota.limit}
                </span>
                <span className={styles.parcelQuotaSep} aria-hidden>
                  ·
                </span>
                <span>Máx {parcelQuota.maxHaPerParcel} ha</span>
                {draftGeometry || drawMode === "edit" ? (
                  <>
                    <span className={styles.parcelQuotaSep} aria-hidden>
                      ·
                    </span>
                    <span className={areaOverPlanLimit ? styles.parcelQuotaOver : undefined}>
                      {drawMode === "edit" ? "Edición" : "Borrador"}{" "}
                      {liveAreaHectares.toFixed(1)} ha
                    </span>
                  </>
                ) : null}
                {showBillingCta ? (
                  <Link
                    className={styles.parcelQuotaUpgrade}
                    href={actionBillingHref ?? "/app/billing"}
                  >
                    Mejorar plan
                  </Link>
                ) : null}
              </div>
            ) : null}
            {actionError ? (
              <p className={styles.chromeAlert} role="alert">
                {actionError}
              </p>
            ) : null}
          </div>
          <div className={styles.chromeRight}>
            <Button
              type="button"
              variant="ghost"
              className={styles.chromeAction}
              onClick={() =>
                resetDrawState({
                  restoreSelection: drawMode === "edit",
                })
              }
              disabled={busy}
            >
              {drawMode === "edit" ? "Cancelar edición" : "Cancelar dibujo"}
            </Button>
            <UserButton />
          </div>
        </header>
      )}

      {listError ? (
        <div className={styles.toast} role="alert">
          {listError}
        </div>
      ) : null}
      {mapChromeActive && actionError ? (
        <div className={styles.toast} role="alert">
          {actionError}
          {actionBillingHref ? (
            <>
              {" "}
              <Link className={styles.toastBillingLink} href={actionBillingHref}>
                Mejorar plan →
              </Link>
            </>
          ) : null}
        </div>
      ) : null}

      {drawMode === "draw" && draftGeometry ? (
        <div className={styles.panelSlot}>
          <Panel title="Guardar parcela" onClose={() => resetDrawState({ restoreSelection: false })}>
            <label className={styles.field}>
              <span>Nombre</span>
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className={styles.input}
                autoFocus
              />
            </label>
            <p className={styles.help}>
              Polígono listo
              {draftGeometry
                ? ` · ~${approximateAreaHectares(draftGeometry).toFixed(1)} ha`
                : ""}
              {parcelQuota
                ? ` · cupo ${parcelQuota.used}/${parcelQuota.limit}, máx ${parcelQuota.maxHaPerParcel} ha`
                : ""}
              .
            </p>
            {actionError ? (
              <p className={styles.panelError} role="alert">
                {actionError}
                {actionBillingHref ? (
                  <>
                    {" "}
                    <Link href={actionBillingHref}>Mejorar plan →</Link>
                  </>
                ) : null}
              </p>
            ) : null}
            <div className={styles.actions}>
              <Button type="button" onClick={() => void saveDraft()} disabled={busy}>
                Guardar parcela
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => resetDrawState({ restoreSelection: false })}
                disabled={busy}
              >
                Descartar
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}

      {drawMode === "edit" ? (
        <div className={styles.panelSlot}>
          <Panel title="Editar parcela" onClose={() => resetDrawState()}>
            <label className={styles.field}>
              <span>Nombre</span>
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className={styles.input}
              />
            </label>
            <p className={styles.help}>
              Arrastra vértices o la parcela en el mapa. Guarda para persistir nombre y geometría
              {draftGeometry
                ? ` · ~${liveAreaHectares.toFixed(1)} ha`
                : ""}
              {parcelQuota ? ` · máx ${parcelQuota.maxHaPerParcel} ha` : ""}.
            </p>
            {actionError ? (
              <p className={styles.panelError} role="alert">
                {actionError}
                {actionBillingHref ? (
                  <>
                    {" "}
                    <Link href={actionBillingHref}>Mejorar plan →</Link>
                  </>
                ) : null}
              </p>
            ) : null}
            <div className={styles.actions}>
              <Button type="button" onClick={() => void saveEdit()} disabled={busy}>
                Guardar cambios
              </Button>
              <Button type="button" variant="ghost" onClick={() => resetDrawState()} disabled={busy}>
                Cancelar
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}

      {drawMode === "idle" && selected ? (
        <div
          className={`${styles.panelSlot} ${mapChromeActive ? styles.panelSlotMapChrome : ""}`}
        >
          <Panel
            title={selected.name}
            onClose={() => selectParcel(null)}
            className={styles.panelFill}
            density="compact"
          >
            <label className={styles.field}>
              <span>Nombre</span>
              <input
                value={detailName}
                onChange={(e) => setDetailName(e.target.value)}
                className={styles.input}
              />
            </label>
            <div className={styles.tabs} role="tablist" aria-label="Secciones de parcela">
              <button
                type="button"
                role="tab"
                aria-selected={sideTab === "weather"}
                className={sideTab === "weather" ? styles.tabActive : styles.tab}
                onClick={() => goToTab("weather")}
              >
                Clima
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sideTab === "spectral"}
                className={sideTab === "spectral" ? styles.tabActive : styles.tab}
                onClick={() => goToTab("spectral")}
              >
                Espectral
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sideTab === "agent"}
                className={sideTab === "agent" ? styles.tabActive : styles.tab}
                onClick={() => goToTab("agent")}
              >
                Agente
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sideTab === "profile"}
                className={sideTab === "profile" ? styles.tabActive : styles.tab}
                onClick={() => goToTab("profile")}
              >
                Perfil
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sideTab === "field"}
                className={sideTab === "field" ? styles.tabActive : styles.tab}
                onClick={() => goToTab("field")}
              >
                Campo
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sideTab === "trace"}
                className={sideTab === "trace" ? styles.tabActive : styles.tab}
                onClick={() => goToTab("trace")}
              >
                Trazabilidad
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sideTab === "review"}
                className={sideTab === "review" ? styles.tabActive : styles.tab}
                onClick={() => goToTab("review")}
              >
                Revisión
              </button>
            </div>
            {sideTab === "weather" ? <WeatherPanel parcel={selected} isAdmin={isAdmin} /> : null}
            {sideTab === "spectral" ? (
              <SpectralPanel
                parcel={selected}
                selectedIndexId={spectralIndexId}
                overlayOpacity={spectralOpacity}
                overlayRendering={spectralRendering}
                overlayFallbackReason={spectralFallbackReason}
                activeZoneId={activeSpectralZoneId}
                onIndexChange={setSpectralIndexId}
                onOpacityChange={setSpectralOpacity}
                onZonesChange={(zones) => setSpectralZones(zones)}
                onActiveZoneChange={setActiveSpectralZoneId}
                onSceneHint={(hint) => setSpectralSceneHint(hint)}
                onPrefetchOverlay={prefetchSpectralOverlay}
                onCompareSceneHint={(hint) => setSpectralCompareHint(hint)}
                compareBlend={spectralCompareBlend}
                onCompareBlendChange={setSpectralCompareBlend}
              />
            ) : null}
            {sideTab === "agent" ? (
              <AgentChatPanel parcel={selected} isAdmin={isAdmin} />
            ) : null}
            {sideTab === "profile" ? (
              <ParcelProfilePanel parcel={selected} isAdmin={isAdmin} />
            ) : null}
            {sideTab === "field" ? (
              <FieldLogPanel
                parcel={selected}
                isAdmin={isAdmin}
                mapZoneLabel={fieldMapZoneLabel}
                onClearMapZone={() => setActiveSpectralZoneId(null)}
              />
            ) : null}
            {sideTab === "trace" ? (
              <TraceLotsPanel parcelId={selected.id} isAdmin={isAdmin} />
            ) : null}
            {sideTab === "review" ? (
              <ReviewPanel parcelId={selected.id} isAdmin={isAdmin} />
            ) : null}
            <div className={styles.panelFooter}>
              <div className={styles.panelFooterActions}>
                <Button
                  type="button"
                  onClick={() => void saveDetailName()}
                  disabled={busy || detailName.trim() === selected.name}
                >
                  Guardar datos
                </Button>
                {selected.geometry?.type === "Polygon" ? (
                  <Button type="button" variant="ghost" onClick={startEditSelected} disabled={busy}>
                    Editar geometría
                  </Button>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                className={styles.panelFooterDanger}
                onClick={() => void deleteSelected()}
                disabled={busy}
              >
                Eliminar parcela
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}

      {drawMode === "idle" && !selected ? (
        <div className={styles.hint}>
          {parcels.length === 0 && !listError
            ? "Pulsa «Dibujar parcela» para crear la primera"
            : "Toca la parcela en el mapa para abrirla · «Nueva parcela» para crear otra"}
        </div>
      ) : null}

      {drawMode === "draw" && !draftGeometry ? (
        <div className={styles.hint}>
          Haz clic en el mapa para trazar el polígono; doble clic para cerrar
        </div>
      ) : null}

      {drawMode === "edit" ? (
        <div className={styles.hint}>Arrastra vértices en el mapa y pulsa Guardar cambios</div>
      ) : null}
    </div>
  );
}
