"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Parcel } from "@/domain/parcel/types";
import { colorForLegendValue, getSpectralLegend } from "@/domain/spectral/overlay-legends";
import type {
  ParcelSpectralZones,
  ParcelVegetationIndices,
  SpectralLimitationReason,
  SpectralZone,
  VegetationIndexId,
} from "@/domain/spectral/types";
import type { SpectralSceneRecord } from "@/domain/spectral/scene-history";
import {
  compareSpectralScenes,
  sceneMeansFromRecord,
} from "@/domain/spectral/compare-scenes";
import {
  indexOfScene,
  sceneAtIndex,
  sortScenesAsc,
  SPECTRAL_TIMELINE_PLAY_MS,
} from "@/domain/spectral/timeline-scenes";
import { VEGETATION_INDEX_ORDER } from "@/domain/spectral/vegetation-indices";
import { formatSceneCapturedAt } from "@/domain/spectral/persist-spectral-scene";
import { Badge } from "@/ui/badge";
import { EvidenceRow } from "@/ui/evidence-row";
import { StateBanner } from "@/ui/state-banner";
import styles from "./spectral-panel.module.css";

type SpectralOk<T> = { status: "OK"; data: T };
type SpectralLimited = {
  status: "SPECTRAL_LIMITED";
  reason: SpectralLimitationReason;
  message: string;
};

function limitationTone(reason: SpectralLimitationReason): "stale" | "unavailable" | "error" {
  if (reason === "stale") return "stale";
  if (reason === "internal_error") return "error";
  return "unavailable";
}

function limitationDetail(reason: SpectralLimitationReason): string | undefined {
  if (reason === "stale") {
    return "La escena superó la política de frescura configurada.";
  }
  if (reason === "unsupported_range") {
    return "El índice solicitado no está soportado.";
  }
  if (reason === "internal_error") {
    return "Intenta de nuevo en unos minutos.";
  }
  return undefined;
}

function freshnessTone(status: string): "fresh" | "stale" | "unknown" {
  if (status === "fresh") return "fresh";
  if (status === "stale") return "stale";
  return "unknown";
}

function tierLabel(tier: SpectralZone["tier"]): string {
  if (tier === "low") return "bajo";
  if (tier === "high") return "alto";
  return "medio";
}

function tierTone(tier: SpectralZone["tier"]): "stale" | "fresh" | "unknown" {
  if (tier === "low") return "stale";
  if (tier === "high") return "fresh";
  return "unknown";
}

function sparklinePoints(
  scenes: SpectralSceneRecord[],
  indexId: VegetationIndexId,
): { points: string; values: Array<number | null> } {
  const values = scenes.map(
    (scene) => scene.indices.find((item) => item.id === indexId)?.value ?? null,
  );
  const numeric = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (numeric.length === 0 || scenes.length === 0) {
    return { points: "", values };
  }
  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  const span = max - min || 0.01;
  const w = 120;
  const h = 28;
  const coords = values
    .map((v, i) => {
      if (v === null) return null;
      const x = scenes.length === 1 ? w / 2 : (i / (scenes.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter((p): p is string => p !== null);
  return { points: coords.join(" "), values };
}

async function fetchSpectral<T>(url: string): Promise<SpectralOk<T> | SpectralLimited> {
  const res = await fetch(url);
  return (await res.json()) as SpectralOk<T> | SpectralLimited;
}

export function SpectralPanel({
  parcel,
  selectedIndexId,
  overlayOpacity,
  overlayRendering = null,
  overlayFallbackReason = null,
  activeZoneId,
  onIndexChange,
  onOpacityChange,
  onZonesChange,
  onActiveZoneChange,
  onSceneHint,
  onPrefetchOverlay,
}: {
  parcel: Parcel;
  selectedIndexId: VegetationIndexId;
  overlayOpacity: number;
  overlayRendering?: "sentinel_raster" | "synthetic_grid" | null;
  overlayFallbackReason?: string | null;
  activeZoneId: string | null;
  onIndexChange: (indexId: VegetationIndexId) => void;
  onOpacityChange: (opacity: number) => void;
  onZonesChange: (zones: SpectralZone[] | null, legendIndexId: VegetationIndexId) => void;
  onActiveZoneChange: (zoneId: string | null) => void;
  onSceneHint?: (hint: {
    acquiredAt: string;
    means: Partial<Record<VegetationIndexId, number | null>>;
  } | null) => void;
  onPrefetchOverlay?: (hint: {
    acquiredAt: string;
    means: Partial<Record<VegetationIndexId, number | null>>;
  }) => void;
}) {
  const [payload, setPayload] = useState<SpectralOk<ParcelVegetationIndices> | SpectralLimited | null>(
    null,
  );
  const [zonesPayload, setZonesPayload] = useState<
    SpectralOk<ParcelSpectralZones> | SpectralLimited | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [refreshingLive, setRefreshingLive] = useState(false);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [historyPayload, setHistoryPayload] = useState<
    | SpectralOk<{ kind: "spectral_history"; days: number; scenes: SpectralSceneRecord[] }>
    | SpectralLimited
    | null
  >(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillMessage, setBackfillMessage] = useState<string | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [timelineSceneId, setTimelineSceneId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const onZonesChangeRef = useRef(onZonesChange);
  const onActiveZoneChangeRef = useRef(onActiveZoneChange);
  const onSceneHintRef = useRef(onSceneHint);
  const onPrefetchOverlayRef = useRef(onPrefetchOverlay);
  onZonesChangeRef.current = onZonesChange;
  onActiveZoneChangeRef.current = onActiveZoneChange;
  onSceneHintRef.current = onSceneHint;
  onPrefetchOverlayRef.current = onPrefetchOverlay;

  useEffect(() => {
    setCompareIds([]);
    setTimelineSceneId(null);
    setIsPlaying(false);
  }, [parcel.id]);

  useEffect(() => {
    setIsPlaying(false);
  }, [selectedIndexId]);

  useEffect(() => {
    if (!activeZoneId) {
      return;
    }
    const row = document.getElementById(`spectral-zone-${activeZoneId}`);
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeZoneId]);

  // History loads immediately (Neon) — does not wait for CDSE indices.
  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryPayload(null);

    void (async () => {
      const result = await fetchSpectral<{
        kind: "spectral_history";
        days: number;
        scenes: SpectralSceneRecord[];
      }>(`/api/parcels/${encodeURIComponent(parcel.id)}/spectral/history?days=90`);
      if (cancelled) return;
      setHistoryPayload(result);
      setHistoryLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [parcel.id, historyRefresh]);

  // Indices: Neon cache first (fast), then live CDSE refresh in background.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPayload(null);
    setRefreshingLive(false);

    void (async () => {
      const cached = await fetchSpectral<ParcelVegetationIndices>(
        `/api/parcels/${encodeURIComponent(parcel.id)}/spectral/indices?source=cache`,
      );
      if (cancelled) return;

      if (cached.status === "OK") {
        setPayload(cached);
        setLoading(false);
        setRefreshingLive(true);
      }

      const live = await fetchSpectral<ParcelVegetationIndices>(
        `/api/parcels/${encodeURIComponent(parcel.id)}/spectral/indices?source=live`,
      );
      if (cancelled) return;
      setPayload(live);
      setLoading(false);
      setRefreshingLive(false);
      if (live.status === "OK") {
        setHistoryRefresh((value) => value + 1);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [parcel.id]);

  const historyScenes =
    historyPayload?.status === "OK" ? historyPayload.data.scenes : [];
  const sortedScenes = useMemo(
    () => sortScenesAsc(historyScenes),
    [historyScenes],
  );

  useEffect(() => {
    if (sortedScenes.length < 2) {
      return;
    }
    const newest = sortedScenes[sortedScenes.length - 1];
    if (!newest) {
      return;
    }
    setTimelineSceneId((current) => current ?? newest.id);
  }, [sortedScenes]);

  const timelineScene =
    timelineSceneId != null
      ? (sortedScenes.find((scene) => scene.id === timelineSceneId) ?? null)
      : null;
  const timelineIndex =
    timelineSceneId != null ? indexOfScene(historyScenes, timelineSceneId) : -1;

  // Publish scene hint so map overlay can skip a second Statistical call per index.
  useEffect(() => {
    if (timelineScene) {
      onSceneHintRef.current?.({
        acquiredAt: timelineScene.acquiredAt,
        means: sceneMeansFromRecord(timelineScene),
      });
      return;
    }
    if (payload?.status !== "OK") {
      onSceneHintRef.current?.(null);
      return;
    }
    const means: Partial<Record<VegetationIndexId, number | null>> = {};
    for (const index of payload.data.indices) {
      means[index.id] = index.value;
    }
    onSceneHintRef.current?.({
      acquiredAt: payload.data.evidence.acquiredAt,
      means,
    });
  }, [payload, timelineScene]);

  useEffect(() => {
    if (!onPrefetchOverlayRef.current || timelineSceneId === null || timelineIndex < 0) {
      return;
    }
    for (const delta of [-1, 0, 1]) {
      const neighbor = sceneAtIndex(historyScenes, timelineIndex + delta);
      if (!neighbor) {
        continue;
      }
      onPrefetchOverlayRef.current({
        acquiredAt: neighbor.acquiredAt,
        means: sceneMeansFromRecord(neighbor),
      });
    }
  }, [timelineSceneId, timelineIndex, historyScenes, selectedIndexId]);

  useEffect(() => {
    if (!isPlaying || sortedScenes.length < 2 || timelineSceneId === null) {
      return;
    }
    const timer = window.setInterval(() => {
      setTimelineSceneId((prevId) => {
        if (!prevId) {
          setIsPlaying(false);
          return prevId;
        }
        const idx = indexOfScene(historyScenes, prevId);
        if (idx < 0 || idx >= sortedScenes.length - 1) {
          setIsPlaying(false);
          return prevId;
        }
        return sortedScenes[idx + 1]!.id;
      });
    }, SPECTRAL_TIMELINE_PLAY_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [isPlaying, sortedScenes, historyScenes, timelineSceneId]);

  // Zones: debounced; skip while autoplay is running.
  useEffect(() => {
    if (isPlaying) {
      return;
    }

    let cancelled = false;
    const debounce = window.setTimeout(() => {
      void (async () => {
        setZonesLoading(true);
        setZonesPayload(null);
        onZonesChangeRef.current(null, selectedIndexId);
        onActiveZoneChangeRef.current(null);

        let acquiredAt: string | null = null;
        let sourceId: string | null = null;
        let parcelMean: number | null = null;

        if (timelineScene) {
          acquiredAt = timelineScene.acquiredAt;
          sourceId = timelineScene.sourceId;
          parcelMean =
            timelineScene.indices.find((item) => item.id === selectedIndexId)?.value ?? null;
        } else if (payload?.status === "OK") {
          acquiredAt = payload.data.evidence.acquiredAt;
          sourceId = payload.data.evidence.sourceId;
          parcelMean =
            payload.data.indices.find((item) => item.id === selectedIndexId)?.value ?? null;
        }

        if (!acquiredAt || !sourceId) {
          if (!cancelled) {
            setZonesLoading(false);
          }
          return;
        }

        const meanParam =
          parcelMean === null ? "null" : encodeURIComponent(String(parcelMean));

        const result = await fetchSpectral<ParcelSpectralZones>(
          `/api/parcels/${encodeURIComponent(parcel.id)}/spectral/zones?index=${encodeURIComponent(selectedIndexId)}&acquiredAt=${encodeURIComponent(acquiredAt)}&parcelMean=${meanParam}&sourceId=${encodeURIComponent(sourceId)}`,
        );
        if (cancelled) {
          return;
        }
        setZonesPayload(result);
        setZonesLoading(false);
        if (result.status === "OK") {
          onZonesChangeRef.current(result.data.zones, selectedIndexId);
        } else {
          onZonesChangeRef.current(null, selectedIndexId);
        }
      })();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(debounce);
    };
  }, [parcel.id, selectedIndexId, payload, timelineScene, isPlaying]);

  function toggleCompare(sceneId: string) {
    setCompareIds((prev) => {
      if (prev.includes(sceneId)) {
        return prev.filter((id) => id !== sceneId);
      }
      if (prev.length >= 2) {
        return [prev[1]!, sceneId];
      }
      return [...prev, sceneId];
    });
  }

  const compareScenes =
    compareIds.length === 2
      ? (() => {
          const a = historyScenes.find((s) => s.id === compareIds[0]);
          const b = historyScenes.find((s) => s.id === compareIds[1]);
          if (!a || !b) return null;
          return compareSpectralScenes(a, b, VEGETATION_INDEX_ORDER);
        })()
      : null;
  const selectedCompare = compareScenes?.byIndex.find(
    (row) => row.indexId === selectedIndexId,
  );
  if (loading && !payload) {
    return (
      <div className={styles.content}>
        <p className={styles.muted}>Cargando índices espectrales…</p>
        {historyLoading ? <p className={styles.muted}>Cargando historial…</p> : null}
        {!historyLoading && historyPayload?.status === "OK" ? (
          <p className={styles.zoneHint}>
            {historyPayload.data.scenes.length} escena
            {historyPayload.data.scenes.length === 1 ? "" : "s"} en historial (Neon)
          </p>
        ) : null}
      </div>
    );
  }

  if (!payload) {
    return null;
  }

  if (payload.status !== "OK") {
    return (
      <StateBanner
        title={payload.message}
        detail={limitationDetail(payload.reason)}
        tone={limitationTone(payload.reason)}
      />
    );
  }

  const { data } = payload;
  const legend = getSpectralLegend(selectedIndexId);
  const activeReading = data.indices.find((index) => index.id === selectedIndexId);
  const zonesOk = zonesPayload?.status === "OK" ? zonesPayload.data : null;
  const historySceneCount = historyScenes.length;
  const showBackfillButton = !historyLoading && historySceneCount <= 3;
  const fromCache = data.evidence.freshnessPolicy.includes("cache_read");
  const zonesFromCache =
    zonesOk?.evidence.freshnessPolicy.includes("zones_cache_read") ?? false;
  const activeZone = zonesOk?.zones.find((zone) => zone.id === activeZoneId) ?? null;
  const zoneDelta =
    activeZone?.value !== null &&
    activeZone?.value !== undefined &&
    zonesOk?.parcelMean !== null &&
    zonesOk?.parcelMean !== undefined
      ? activeZone.value - zonesOk.parcelMean
      : null;

  async function runBackfill() {
    setBackfillLoading(true);
    setBackfillMessage(null);
    try {
      const res = await fetch(
        `/api/parcels/${encodeURIComponent(parcel.id)}/spectral/backfill?days=30`,
        { method: "POST" },
      );
      const body = (await res.json()) as
        | SpectralOk<{
            kind: "spectral_backfill";
            scenesFound: number;
            scenesPersisted: number;
          }>
        | SpectralLimited;
      if (body.status === "OK") {
        setBackfillMessage(
          `${body.data.scenesFound} escena${body.data.scenesFound === 1 ? "" : "s"} importada${body.data.scenesFound === 1 ? "" : "s"}`,
        );
        setHistoryRefresh((value) => value + 1);
      } else {
        setBackfillMessage(body.message);
      }
    } catch {
      setBackfillMessage("No se pudo importar el historial.");
    } finally {
      setBackfillLoading(false);
    }
  }

  return (
    <div className={styles.content}>
      <p className={styles.intro}>
        Índices de vegetación derivados de reflectancia Sentinel-2 L2A. El mapa
        muestra raster CDSE con contraste local (estirado alrededor de la media
        de la parcela); si Process falla, grilla indicativa. Las zonas son
        contornos fishnet recortados a la parcela. Requiere Intelligence Plus.
      </p>
      <p className={styles.muted}>
        Escena {data.acquisitionDate}
        <span className={styles.freshnessInline}>
          <Badge tone={freshnessTone(data.evidence.freshnessStatus)}>
            {data.evidence.freshnessStatus}
          </Badge>
        </span>
        {overlayRendering === "sentinel_raster" ? (
          <span className={styles.freshnessInline}>
            <Badge tone="fresh">PNG satélite</Badge>
          </span>
        ) : overlayRendering === "synthetic_grid" ? (
          <span className={styles.freshnessInline}>
            <Badge tone="stale">grilla indicativa</Badge>
          </span>
        ) : (
          <span className={styles.freshnessInline}>
            <Badge tone="unknown">overlay…</Badge>
          </span>
        )}
        {overlayRendering === "synthetic_grid" && overlayFallbackReason ? (
          <span className={styles.zoneHint}> · {overlayFallbackReason}</span>
        ) : null}
        {fromCache ? (
          <span className={styles.freshnessInline}>
            <Badge tone="unknown">cache</Badge>
          </span>
        ) : null}
        {refreshingLive ? <span className={styles.zoneHint}> · Actualizando satélite…</span> : null}
      </p>

      <div className={styles.indexGrid}>
        {data.indices.map((index) => (
          <button
            key={index.id}
            type="button"
            className={index.id === selectedIndexId ? styles.indexChipActive : styles.indexChip}
            onClick={() => onIndexChange(index.id)}
          >
            {index.label}
          </button>
        ))}
      </div>

      <div className={styles.legendBlock}>
        <p className={styles.legendTitle}>Leyenda {legend.minLabel === "Estrés" ? selectedIndexId.toUpperCase() : activeReading?.label}</p>
        <div className={styles.legendBar}>
          {legend.stops.map((stop) => (
            <span
              key={stop.value}
              className={styles.legendStop}
              style={{ backgroundColor: stop.color }}
            />
          ))}
        </div>
        <div className={styles.legendLabels}>
          <span>
            {legend.min} {legend.minLabel}
          </span>
          <span>
            {legend.max}+ {legend.maxLabel}
          </span>
        </div>
      </div>

      <label className={styles.opacityField}>
        <span>Opacidad overlay ({Math.round(overlayOpacity * 100)}%)</span>
        <input
          type="range"
          min={0.2}
          max={1}
          step={0.02}
          value={overlayOpacity}
          onChange={(event) => onOpacityChange(Number(event.target.value))}
        />
      </label>

      <ul className={styles.compactList}>
        {data.indices.map((index) => {
          const barColor =
            index.value === null ? "var(--color-border-subtle)" : colorForLegendValue(index.value, getSpectralLegend(index.id));
          return (
            <li key={index.id} className={styles.compactRow}>
              <span className={styles.compactLabel}>{index.label}</span>
              <div className={styles.compactTrack}>
                <span
                  className={styles.compactFill}
                  style={{
                    width: `${index.value === null ? 0 : Math.min(100, Math.max(4, ((index.value + 1) / 2) * 100))}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>
              <span className={styles.compactValue}>
                {index.value === null ? "—" : index.value.toFixed(2)}
              </span>
            </li>
          );
        })}
      </ul>

      <div className={styles.zonesBlock}>
        <p className={styles.legendTitle}>
          Zonas · {selectedIndexId.toUpperCase()}
          {zonesFromCache ? (
            <span className={styles.freshnessInline}>
              {" "}
              <Badge tone="unknown">cache</Badge>
            </span>
          ) : null}
        </p>
        {zonesLoading ? (
          <p className={styles.muted}>Calculando zonas…</p>
        ) : null}
        {!zonesLoading && zonesPayload && zonesPayload.status !== "OK" ? (
          <p className={styles.muted}>{zonesPayload.message}</p>
        ) : null}
        {!zonesLoading && zonesOk && activeZone ? (
          <div className={styles.zoneDetail} role="status">
            <div className={styles.zoneDetailHeader}>
              <p className={styles.zoneDetailTitle}>
                Zona {activeZone.label}
                <Badge tone={tierTone(activeZone.tier)}>{tierLabel(activeZone.tier)}</Badge>
              </p>
              <button
                type="button"
                className={styles.zoneDetailClose}
                onClick={() => onActiveZoneChange(null)}
                aria-label="Cerrar detalle de zona"
              >
                Cerrar
              </button>
            </div>
            <dl className={styles.zoneDetailStats}>
              <div>
                <dt>{selectedIndexId.toUpperCase()}</dt>
                <dd>{activeZone.value === null ? "—" : activeZone.value.toFixed(2)}</dd>
              </div>
              <div>
                <dt>Área</dt>
                <dd>{Math.round(activeZone.areaShare * 100)}%</dd>
              </div>
              <div>
                <dt>vs media</dt>
                <dd>
                  {zoneDelta === null
                    ? "—"
                    : `${zoneDelta > 0 ? "+" : ""}${zoneDelta.toFixed(2)}`}
                </dd>
              </div>
            </dl>
            <p className={styles.zoneHint}>
              Tier relativo dentro de la parcela (no umbral agronómico absoluto). Click fuera de
              la cuadrícula en el mapa para limpiar.
            </p>
          </div>
        ) : null}
        {!zonesLoading && zonesOk ? (
          <ul className={styles.zoneList}>
            {zonesOk.zones.map((zone) => {
              const active = zone.id === activeZoneId;
              return (
                <li key={zone.id} id={`spectral-zone-${zone.id}`}>
                  <button
                    type="button"
                    className={active ? styles.zoneRowActive : styles.zoneRow}
                    onClick={() => onActiveZoneChange(active ? null : zone.id)}
                  >
                    <span className={styles.zoneLabel}>{zone.label}</span>
                    <Badge tone={tierTone(zone.tier)}>{tierLabel(zone.tier)}</Badge>
                    <span className={styles.zoneMeta}>
                      {Math.round(zone.areaShare * 100)}%
                    </span>
                    <span className={styles.zoneValue}>
                      {zone.value === null ? "—" : zone.value.toFixed(2)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
        {!zonesLoading && zonesOk ? (
          <p className={styles.zoneHint}>
            Media parcela {zonesOk.parcelMean === null ? "—" : zonesOk.parcelMean.toFixed(2)} ·
            tiers relativos (no umbrales agronómicos absolutos)
          </p>
        ) : null}
      </div>

      <div className={styles.historyBlock}>
        <p className={styles.legendTitle}>Historial · {selectedIndexId.toUpperCase()}</p>
        <p className={styles.zoneHint}>
          Arrastra o reproduce capturas guardadas. Zonas se actualizan al pausar. Elige hasta 2
          fechas para comparar medias; «Mapa» fija el slider en esa captura.
        </p>
        {timelineSceneId === null ? (
          <div className={styles.mapSceneBanner}>
            <span>Vista actual (índices en vivo)</span>
          </div>
        ) : timelineScene ? (
          <div className={styles.mapSceneBanner}>
            <span>
              Mapa: {timelineScene.acquisitionDate} (histórico)
            </span>
            <button
              type="button"
              className={styles.historyMapButton}
              onClick={() => {
                setIsPlaying(false);
                setTimelineSceneId(null);
              }}
            >
              Actual
            </button>
          </div>
        ) : null}
        {compareScenes && selectedCompare ? (
          <div className={styles.compareBlock}>
            <p className={styles.compareHeadline}>
              {compareScenes.earlier.acquisitionDate} → {compareScenes.later.acquisitionDate}
              {" · "}
              {selectedIndexId.toUpperCase()}{" "}
              {selectedCompare.delta == null
                ? "—"
                : `${selectedCompare.delta > 0 ? "+" : ""}${selectedCompare.delta.toFixed(2)}`}
            </p>
            <table className={styles.compareTable}>
              <thead>
                <tr>
                  <th>Índice</th>
                  <th>{compareScenes.earlier.acquisitionDate.slice(5)}</th>
                  <th>{compareScenes.later.acquisitionDate.slice(5)}</th>
                  <th>Δ</th>
                </tr>
              </thead>
              <tbody>
                {compareScenes.byIndex.map((row) => (
                  <tr
                    key={row.indexId}
                    className={
                      row.indexId === selectedIndexId ? styles.compareRowActive : undefined
                    }
                  >
                    <td>{row.indexId.toUpperCase()}</td>
                    <td>{row.earlierValue == null ? "—" : row.earlierValue.toFixed(2)}</td>
                    <td>{row.laterValue == null ? "—" : row.laterValue.toFixed(2)}</td>
                    <td>
                      {row.delta == null
                        ? "—"
                        : `${row.delta > 0 ? "+" : ""}${row.delta.toFixed(2)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : compareIds.length === 1 ? (
          <p className={styles.zoneHint}>Selecciona una segunda fecha para ver Δ.</p>
        ) : null}
        {showBackfillButton ? (
          <div className={styles.backfillRow}>
            <button
              type="button"
              className={styles.backfillButton}
              disabled={backfillLoading}
              onClick={() => void runBackfill()}
            >
              {backfillLoading ? "Importando…" : "Importar últimos 30 días"}
            </button>
            {backfillMessage ? <p className={styles.zoneHint}>{backfillMessage}</p> : null}
          </div>
        ) : null}
        {historyLoading ? <p className={styles.muted}>Cargando historial…</p> : null}
        {!historyLoading && historyPayload && historyPayload.status !== "OK" ? (
          <p className={styles.muted}>{historyPayload.message}</p>
        ) : null}
        {!historyLoading && historyPayload?.status === "OK" ? (
          <>
            {historyScenes.length === 0 ? (
              <p className={styles.muted}>
                Sin escenas guardadas aún. Usa «Importar últimos 30 días» o consulta índices.
              </p>
            ) : (
              <>
                {(() => {
                  const spark = sparklinePoints(historyScenes, selectedIndexId);
                  return spark.points ? (
                    <svg
                      className={styles.sparkline}
                      viewBox="0 0 120 28"
                      role="img"
                      aria-label={`Tendencia ${selectedIndexId}`}
                    >
                      <polyline
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        points={spark.points}
                      />
                    </svg>
                  ) : null;
                })()}
                {sortedScenes.length >= 2 ? (
                  <div className={styles.timelineBlock}>
                    <div className={styles.timelineControls}>
                      <button
                        type="button"
                        className={styles.timelinePlayButton}
                        disabled={timelineSceneId === null}
                        onClick={() => setIsPlaying((playing) => !playing)}
                        aria-pressed={isPlaying}
                      >
                        {isPlaying ? "Pausa" : "Play"}
                      </button>
                      <input
                        type="range"
                        className={styles.timelineSlider}
                        min={0}
                        max={sortedScenes.length - 1}
                        step={1}
                        value={
                          timelineIndex >= 0 ? timelineIndex : sortedScenes.length - 1
                        }
                        onChange={(event) => {
                          const nextIndex = Number(event.target.value);
                          const scene = sceneAtIndex(historyScenes, nextIndex);
                          if (!scene) {
                            return;
                          }
                          setIsPlaying(false);
                          setTimelineSceneId(scene.id);
                        }}
                        aria-label="Línea de tiempo de capturas"
                      />
                    </div>
                    <div className={styles.timelineLabels}>
                      <span>{sortedScenes[0]?.acquisitionDate}</span>
                      <span>{sortedScenes[sortedScenes.length - 1]?.acquisitionDate}</span>
                    </div>
                    <p className={styles.timelineCurrent}>
                      {timelineScene
                        ? timelineScene.acquisitionDate
                        : "Vista actual (índices en vivo)"}
                    </p>
                  </div>
                ) : null}
                <ul className={styles.historyList}>
                  {[...historyScenes].reverse().slice(0, 8).map((scene) => {
                    const reading = scene.indices.find((item) => item.id === selectedIndexId);
                    const compareSlot = compareIds.indexOf(scene.id);
                    const onMap = timelineSceneId === scene.id;
                    return (
                      <li key={scene.id} className={styles.historyRow}>
                        <button
                          type="button"
                          className={
                            compareSlot >= 0 ? styles.historySelectActive : styles.historySelect
                          }
                          onClick={() => toggleCompare(scene.id)}
                          aria-pressed={compareSlot >= 0}
                        >
                          {compareSlot >= 0 ? (
                            <span className={styles.compareBadge}>
                              {compareSlot === 0 ? "A" : "B"}
                            </span>
                          ) : null}
                          <span className={styles.historyDate}>
                            <span>{scene.acquisitionDate}</span>
                            <span className={styles.historyCapture}>
                              Captura:{" "}
                              {formatSceneCapturedAt(scene.acquiredAt, parcel.timezone)}
                            </span>
                          </span>
                          <span className={styles.historyValue}>
                            {reading?.value == null ? "—" : reading.value.toFixed(2)}
                          </span>
                        </button>
                        <button
                          type="button"
                          className={onMap ? styles.historyMapButtonActive : styles.historyMapButton}
                          onClick={() => {
                            setIsPlaying(false);
                            setTimelineSceneId(onMap ? null : scene.id);
                          }}
                          aria-pressed={onMap}
                        >
                          Mapa
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className={styles.zoneHint}>
                  {historySceneCount} escena
                  {historySceneCount === 1 ? "" : "s"} · últimos{" "}
                  {historyPayload.data.days} días · hora de captura satelital, no de consulta
                </p>
              </>
            )}
          </>
        ) : null}
      </div>

      <div className={styles.evidence}>
        <EvidenceRow label="Fuente" value={data.evidence.sourceLabel} />
        <EvidenceRow
          label="Captura (satélite)"
          value={formatSceneCapturedAt(
            timelineScene?.acquiredAt ?? data.evidence.acquiredAt,
            parcel.timezone,
          )}
        />
        {timelineScene ? (
          <EvidenceRow label="Mapa histórico" value={timelineScene.acquisitionDate} />
        ) : null}
        {data.evidence.satelliteMission ? (
          <EvidenceRow label="Misión" value={data.evidence.satelliteMission} />
        ) : null}
        {data.evidence.processingLevel ? (
          <EvidenceRow label="Nivel" value={data.evidence.processingLevel} />
        ) : null}
        <EvidenceRow label="Timezone" value={data.evidence.timezone} />
        <EvidenceRow
          label="Alcance"
          value={`${data.evidence.spatialScope.latitude.toFixed(4)}, ${data.evidence.spatialScope.longitude.toFixed(4)}`}
        />
        <EvidenceRow label="Política frescura" value={data.evidence.freshnessPolicy} />
      </div>
    </div>
  );
}
