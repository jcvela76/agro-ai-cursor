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
import type { VegetationIndexId } from "@/domain/spectral/types";
import { MapChip } from "@/ui/map-chip";
import { ParcelSelector } from "@/ui/parcel-selector";
import { SpectralParcelSummary } from "@/ui/spectral-parcel-summary";
import { AgentChatPanel } from "@/ui/agent-chat-panel";
import { Button } from "@/ui/button";
import { ensureMapLibreWorker } from "@/ui/maplibre-worker";
import { Panel } from "@/ui/panel";
import { ReviewPanel } from "@/ui/review-panel";
import { TraceLotsPanel } from "@/ui/trace-lots-panel";
import { SpectralPanel } from "@/ui/spectral-panel";
import {
  applySpectralMapOverlay,
  clearSpectralMapOverlay,
} from "@/ui/spectral-map-overlay";
import { WeatherPanel } from "@/ui/weather-panel";
import styles from "./app-shell.module.css";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const PARCELS_SOURCE = "agro-parcels";
const PARCELS_FILL = "agro-parcels-fill";
const PARCELS_LINE = "agro-parcels-line";
const PARCEL_DETAIL_MAX_ZOOM = 16;

type DrawMode = "idle" | "draw" | "edit";
type SideTab = "weather" | "spectral" | "agent" | "trace" | "review";

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
}: {
  initialParcelId: string | null;
}) {
  const router = useRouter();
  const { has } = useAuth();
  const { organization } = useOrganization();
  const isAdmin = has?.({ role: "org:admin" }) ?? false;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const draftFeatureIdRef = useRef<string | number | null>(null);
  const editingParcelIdRef = useRef<string | null>(null);
  const drawModeRef = useRef<DrawMode>("idle");
  const selectParcelRef = useRef<(parcelId: string | null) => void>(() => {});

  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialParcelId);
  const [drawMode, setDrawMode] = useState<DrawMode>("idle");
  const [sideTab, setSideTab] = useState<SideTab>("weather");
  const [draftName, setDraftName] = useState("Nueva parcela");
  const [draftGeometry, setDraftGeometry] = useState<ParcelGeometry | null>(null);
  const [detailName, setDetailName] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [drawReady, setDrawReady] = useState(false);
  const [spectralIndexId, setSpectralIndexId] = useState<VegetationIndexId>("ndre");
  const [spectralOpacity, setSpectralOpacity] = useState(0.62);

  drawModeRef.current = drawMode;

  const selectParcel = useCallback(
    (parcelId: string | null, options?: { keepTab?: boolean }) => {
      setSelectedId(parcelId);
      if (!options?.keepTab) {
        setSideTab("weather");
      }
      const url = parcelId ? `/app?parcel=${encodeURIComponent(parcelId)}` : "/app";
      router.replace(url, { scroll: false });
    },
    [router],
  );
  selectParcelRef.current = selectParcel;

  const reloadParcels = useCallback(async () => {
    const res = await fetch("/api/parcels");
    const json = (await res.json()) as {
      status: string;
      data?: Parcel[];
      message?: string;
    };
    if (!res.ok || json.status !== "OK" || !json.data) {
      setListError(json.message ?? "No se pudieron cargar las parcelas");
      return;
    }
    setParcels(json.data);
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
      if (!map.getLayer(PARCELS_FILL)) {
        return;
      }
      const hits = map.queryRenderedFeatures(event.point, { layers: [PARCELS_FILL] });
      const parcelId = hits[0]?.properties?.parcelId;
      if (typeof parcelId === "string") {
        selectParcelRef.current(parcelId);
      }
    });

    map.on("mousemove", (event) => {
      if (drawModeRef.current !== "idle" || !map.getLayer(PARCELS_FILL)) {
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
          selectParcel(parcel.id);
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
    if (!map || drawMode !== "idle" || sideTab !== "spectral" || !selectedId || !selected?.geometry) {
      if (map) {
        clearSpectralMapOverlay(map);
      }
      return;
    }

    let cancelled = false;
    void (async () => {
      const res = await fetch(
        `/api/parcels/${encodeURIComponent(selectedId)}/spectral/overlay?index=${encodeURIComponent(spectralIndexId)}`,
      );
      const json = (await res.json()) as {
        status: string;
        data?: Parameters<typeof applySpectralMapOverlay>[1];
      };
      if (cancelled || json.status !== "OK" || !json.data) {
        if (!cancelled) {
          clearSpectralMapOverlay(map);
        }
        return;
      }

      const paint = () => {
        if (cancelled) return;
        applySpectralMapOverlay(map, json.data!, spectralOpacity, PARCELS_LINE);
      };
      if (map.isStyleLoaded()) {
        paint();
      } else {
        map.once("style.load", paint);
      }
    })();

    return () => {
      cancelled = true;
      clearSpectralMapOverlay(map);
    };
  }, [drawMode, selected, selectedId, sideTab, spectralIndexId, spectralOpacity]);

  const spectralActive =
    drawMode === "idle" && sideTab === "spectral" && Boolean(selected?.geometry);
  const mapChromeActive = drawMode === "idle";

  const summaryTitle = organization?.name
    ? shortOrgDisplayName(organization.name)
    : (selected?.name ?? "");
  const summaryAreaHectares =
    selected?.geometry?.type === "Polygon" ? approximateAreaHectares(selected.geometry) : 0;

  const resetDrawState = (opts?: { restoreSelection?: boolean }) => {
    const editingId = editingParcelIdRef.current;
    drawRef.current?.clear();
    drawRef.current?.setMode("render");
    draftFeatureIdRef.current = null;
    editingParcelIdRef.current = null;
    setDraftGeometry(null);
    setDrawMode("idle");
    setActionError(null);
    if (opts?.restoreSelection !== false && editingId) {
      selectParcel(editingId);
    }
  };

  const startDraw = () => {
    const draw = drawRef.current;
    if (!draw) {
      setActionError("Espera a que el mapa termine de cargar e inténtalo de nuevo");
      return;
    }
    setActionError(null);
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
      setActionError("Dibuja un polígono cerrado primero");
      return;
    }
    const name = draftName.trim();
    if (!name) {
      setActionError("El nombre es obligatorio");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch("/api/parcels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, geometry: draftGeometry }),
      });
      const json = (await res.json()) as { status: string; data?: Parcel; message?: string };
      if (!res.ok || json.status !== "OK" || !json.data) {
        setActionError(json.message ?? "No se pudo guardar");
        return;
      }
      resetDrawState({ restoreSelection: false });
      await reloadParcels();
      selectParcel(json.data.id);
    } catch {
      setActionError("No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  const startEditSelected = () => {
    const draw = drawRef.current;
    const map = mapRef.current;
    if (!draw || !selected?.geometry || selected.geometry.type !== "Polygon") {
      setActionError("Esta parcela no tiene polígono editable");
      return;
    }
    if (!drawReady) {
      setActionError("Espera a que el mapa termine de cargar e inténtalo de nuevo");
      return;
    }
    const geometry = selected.geometry;
    const parcelId = selected.id;
    setActionError(null);
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
        setActionError("No se pudo cargar la geometría para editar");
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
      setActionError("No hay geometría para guardar");
      return;
    }
    const feature = draw.getSnapshotFeature(featureId);
    if (!feature || feature.geometry.type !== "Polygon") {
      setActionError("Geometría inválida");
      return;
    }
    const name = draftName.trim();
    if (!name) {
      setActionError("El nombre es obligatorio");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/parcels/${encodeURIComponent(editingId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, geometry: feature.geometry }),
      });
      const json = (await res.json()) as { status: string; data?: Parcel; message?: string };
      if (!res.ok || json.status !== "OK" || !json.data) {
        setActionError(json.message ?? "No se pudo actualizar");
        return;
      }
      resetDrawState({ restoreSelection: false });
      await reloadParcels();
      selectParcel(json.data.id);
    } catch {
      setActionError("No se pudo actualizar");
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
        </div>
        <div className={styles.chromeRight}>
          {isAdmin ? (
            <Link className={styles.adminLink} href="/app/admin">
              Admin
            </Link>
          ) : null}
          <Button
            type="button"
            variant="onDark"
            onClick={startDraw}
            disabled={busy || !drawReady}
            className={styles.chromeAction}
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

      {mapChromeActive ? (
        mapChromeStack
      ) : (
        <header className={styles.chrome}>
          <p className={styles.brand}>Agro AI</p>
          <div className={styles.chromeRight}>
            <UserButton />
          </div>
        </header>
      )}

      {listError ? (
        <div className={styles.toast} role="alert">
          {listError}
        </div>
      ) : null}
      {actionError ? (
        <div className={styles.toast} role="alert">
          {actionError}
        </div>
      ) : null}

      {drawMode === "draw" && !draftGeometry ? (
        <div className={styles.mapToolbar}>
          <Button type="button" variant="ghost" onClick={() => resetDrawState({ restoreSelection: false })}>
            Cancelar dibujo
          </Button>
        </div>
      ) : drawMode === "edit" ? (
        <div className={styles.mapToolbar}>
          <Button type="button" variant="ghost" onClick={() => resetDrawState()}>
            Cancelar edición
          </Button>
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
            <p className={styles.help}>Polígono listo. Guarda nombre y geometría en el workspace.</p>
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
              Arrastra vértices o la parcela en el mapa. Guarda para persistir nombre y geometría.
            </p>
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
            <div className={styles.actions}>
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
            <div className={styles.tabs}>
              <button
                type="button"
                className={sideTab === "weather" ? styles.tabActive : styles.tab}
                onClick={() => setSideTab("weather")}
              >
                Clima
              </button>
              <button
                type="button"
                className={sideTab === "spectral" ? styles.tabActive : styles.tab}
                onClick={() => setSideTab("spectral")}
              >
                Espectral
              </button>
              <button
                type="button"
                className={sideTab === "agent" ? styles.tabActive : styles.tab}
                onClick={() => setSideTab("agent")}
              >
                Agente
              </button>
              <button
                type="button"
                className={sideTab === "trace" ? styles.tabActive : styles.tab}
                onClick={() => setSideTab("trace")}
              >
                Trazabilidad
              </button>
              <button
                type="button"
                className={sideTab === "review" ? styles.tabActive : styles.tab}
                onClick={() => setSideTab("review")}
              >
                Revisión
              </button>
            </div>
            {sideTab === "weather" ? <WeatherPanel parcel={selected} /> : null}
            {sideTab === "spectral" ? (
              <SpectralPanel
                parcel={selected}
                selectedIndexId={spectralIndexId}
                overlayOpacity={spectralOpacity}
                onIndexChange={setSpectralIndexId}
                onOpacityChange={setSpectralOpacity}
              />
            ) : null}
            {sideTab === "agent" ? (
              <AgentChatPanel parcel={selected} isAdmin={isAdmin} />
            ) : null}
            {sideTab === "trace" ? (
              <TraceLotsPanel parcelId={selected.id} isAdmin={isAdmin} />
            ) : null}
            {sideTab === "review" ? (
              <ReviewPanel parcelId={selected.id} isAdmin={isAdmin} />
            ) : null}
            <div className={styles.panelFooter}>
              <Button
                type="button"
                variant="ghost"
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
