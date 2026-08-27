"use client";

import { OrganizationSwitcher, UserButton, useAuth } from "@clerk/nextjs";
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
import { AgentChatPanel } from "@/ui/agent-chat-panel";
import { Button } from "@/ui/button";
import { Panel } from "@/ui/panel";
import { WeatherPanel } from "@/ui/weather-panel";
import styles from "./app-shell.module.css";

const STYLE_URL = "https://demotiles.maplibre.org/style.json";
const PARCELS_SOURCE = "agro-parcels";
const PARCELS_FILL = "agro-parcels-fill";
const PARCELS_LINE = "agro-parcels-line";

type DrawMode = "idle" | "draw" | "edit";
type SideTab = "weather" | "agent";

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

function syncParcelLayers(map: MapLibreMap, parcels: Parcel[]) {
  const data = parcelsToFeatureCollection(parcels);
  const source = map.getSource(PARCELS_SOURCE) as GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
    return;
  }
  map.addSource(PARCELS_SOURCE, { type: "geojson", data });
  map.addLayer({
    id: PARCELS_FILL,
    type: "fill",
    source: PARCELS_SOURCE,
    paint: { "fill-color": "#4F6F52", "fill-opacity": 0.35 },
  });
  map.addLayer({
    id: PARCELS_LINE,
    type: "line",
    source: PARCELS_SOURCE,
    paint: { "line-color": "#1C2A1F", "line-width": 2 },
  });
}

export function AppShell({
  initialParcelId,
}: {
  initialParcelId: string | null;
}) {
  const router = useRouter();
  const { has } = useAuth();
  const isAdmin = has?.({ role: "org:admin" }) ?? false;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const draftFeatureIdRef = useRef<string | number | null>(null);
  const editingParcelIdRef = useRef<string | null>(null);

  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialParcelId);
  const [drawMode, setDrawMode] = useState<DrawMode>("idle");
  const [sideTab, setSideTab] = useState<SideTab>("weather");
  const [draftName, setDraftName] = useState("Nueva parcela");
  const [draftGeometry, setDraftGeometry] = useState<ParcelGeometry | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectParcel = useCallback(
    (parcelId: string | null) => {
      setSelectedId(parcelId);
      setSideTab("weather");
      const url = parcelId ? `/app?parcel=${encodeURIComponent(parcelId)}` : "/app";
      router.replace(url, { scroll: false });
    },
    [router],
  );

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
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: STYLE_URL,
      center: [-77.05, -11.95],
      zoom: 8,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;

    map.on("load", () => {
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
          new TerraDrawPolygonMode(),
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
          }),
        ],
      });
      draw.start();
      draw.setMode("render");
      drawRef.current = draw;

      draw.on("finish", (id) => {
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
    });

    return () => {
      drawRef.current?.stop();
      drawRef.current = null;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const apply = () => syncParcelLayers(map, parcels);
    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("load", apply);
    }

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const parcel of parcels) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = styles.marker;
      el.setAttribute("aria-label", parcel.name);
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        if (drawMode !== "idle") {
          return;
        }
        selectParcel(parcel.id);
      });

      const marker = new Marker({ element: el })
        .setLngLat([parcel.longitude, parcel.latitude])
        .addTo(map);
      markersRef.current.push(marker);
    }

    if (parcels.length === 1) {
      map.flyTo({
        center: [parcels[0].longitude, parcels[0].latitude],
        zoom: 11,
        essential: true,
      });
    } else if (parcels.length > 1) {
      const bounds = new LngLatBounds();
      for (const p of parcels) {
        bounds.extend([p.longitude, p.latitude]);
      }
      map.fitBounds(bounds, { padding: 80, maxZoom: 12 });
    }
  }, [parcels, selectParcel, drawMode]);

  const selected = parcels.find((p) => p.id === selectedId) ?? null;

  const resetDrawState = () => {
    drawRef.current?.clear();
    drawRef.current?.setMode("render");
    draftFeatureIdRef.current = null;
    editingParcelIdRef.current = null;
    setDraftGeometry(null);
    setDrawMode("idle");
    setActionError(null);
  };

  const startDraw = () => {
    const draw = drawRef.current;
    if (!draw) return;
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
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch("/api/parcels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draftName, geometry: draftGeometry }),
      });
      const json = (await res.json()) as { status: string; data?: Parcel; message?: string };
      if (!res.ok || json.status !== "OK" || !json.data) {
        setActionError(json.message ?? "No se pudo guardar");
        return;
      }
      resetDrawState();
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
    if (!draw || !selected?.geometry || selected.geometry.type !== "Polygon") {
      return;
    }
    setActionError(null);
    editingParcelIdRef.current = selected.id;
    draw.clear();
    const featureId = draw.getFeatureId();
    draw.addFeatures([
      {
        type: "Feature",
        id: featureId,
        geometry: selected.geometry,
        properties: { mode: "polygon" },
      },
    ]);
    draftFeatureIdRef.current = featureId;
    setDraftGeometry(selected.geometry);
    setDraftName(selected.name);
    draw.setMode("select");
    draw.selectFeature(featureId);
    setDrawMode("edit");
    selectParcel(null);
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
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/parcels/${encodeURIComponent(editingId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draftName, geometry: feature.geometry }),
      });
      const json = (await res.json()) as { status: string; data?: Parcel; message?: string };
      if (!res.ok || json.status !== "OK" || !json.data) {
        setActionError(json.message ?? "No se pudo actualizar");
        return;
      }
      resetDrawState();
      await reloadParcels();
      selectParcel(json.data.id);
    } catch {
      setActionError("No se pudo actualizar");
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

  return (
    <div className={styles.shell}>
      <div ref={mapContainerRef} className={styles.map} />

      <header className={styles.chrome}>
        <p className={styles.brand}>Agro AI</p>
        <div className={styles.toolbar}>
          {drawMode === "idle" ? (
            <Button type="button" variant="onDark" onClick={startDraw}>
              Dibujar parcela
            </Button>
          ) : (
            <Button type="button" variant="onDark" onClick={resetDrawState}>
              Cancelar
            </Button>
          )}
        </div>
        <div className={styles.chromeRight}>
          {isAdmin ? (
            <Link className={styles.adminLink} href="/app/admin">
              Admin
            </Link>
          ) : null}
          <OrganizationSwitcher
            hidePersonal
            afterSelectOrganizationUrl="/app"
            appearance={{
              elements: {
                rootBox: styles.orgSwitcher,
              },
            }}
          />
          <UserButton />
        </div>
      </header>

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

      {drawMode === "draw" && draftGeometry ? (
        <div className={styles.panelSlot}>
          <Panel title="Guardar parcela" onClose={resetDrawState}>
            <label className={styles.field}>
              <span>Nombre</span>
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className={styles.input}
              />
            </label>
            <p className={styles.help}>Polígono listo. Guarda para persistirlo en el workspace.</p>
            <div className={styles.actions}>
              <Button type="button" onClick={() => void saveDraft()} disabled={busy}>
                Guardar
              </Button>
              <Button type="button" variant="ghost" onClick={resetDrawState} disabled={busy}>
                Descartar
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}

      {drawMode === "edit" ? (
        <div className={styles.panelSlot}>
          <Panel title="Editar parcela" onClose={resetDrawState}>
            <label className={styles.field}>
              <span>Nombre</span>
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className={styles.input}
              />
            </label>
            <p className={styles.help}>Arrastra vértices en el mapa y guarda los cambios.</p>
            <div className={styles.actions}>
              <Button type="button" onClick={() => void saveEdit()} disabled={busy}>
                Guardar cambios
              </Button>
              <Button type="button" variant="ghost" onClick={resetDrawState} disabled={busy}>
                Cancelar
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}

      {drawMode === "idle" && selected ? (
        <div className={styles.panelSlot}>
          <Panel title={selected.name} onClose={() => selectParcel(null)} className={styles.panelFill}>
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
                className={sideTab === "agent" ? styles.tabActive : styles.tab}
                onClick={() => setSideTab("agent")}
              >
                Agente
              </button>
            </div>
            {sideTab === "weather" ? <WeatherPanel parcel={selected} /> : null}
            {sideTab === "agent" ? (
              <AgentChatPanel parcel={selected} isAdmin={isAdmin} />
            ) : null}
          </Panel>
          <div className={styles.dangerRow}>
            {selected.geometry?.type === "Polygon" ? (
              <Button type="button" variant="ghost" onClick={startEditSelected} disabled={busy}>
                Editar geometría
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => void deleteSelected()} disabled={busy}>
              Eliminar parcela
            </Button>
          </div>
        </div>
      ) : null}

      {drawMode === "idle" && !selected ? (
        <div className={styles.hint}>
          {parcels.length === 0 && !listError
            ? "Dibuja tu primera parcela"
            : "Selecciona una parcela o dibuja una nueva"}
        </div>
      ) : null}

      {drawMode === "draw" && !draftGeometry ? (
        <div className={styles.hint}>
          Haz clic en el mapa para trazar el polígono; doble clic para cerrar
        </div>
      ) : null}
    </div>
  );
}
