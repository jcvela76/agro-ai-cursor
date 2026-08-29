"use client";

import { useEffect, useRef, useState } from "react";
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
  activeZoneId,
  onIndexChange,
  onOpacityChange,
  onZonesChange,
  onActiveZoneChange,
}: {
  parcel: Parcel;
  selectedIndexId: VegetationIndexId;
  overlayOpacity: number;
  activeZoneId: string | null;
  onIndexChange: (indexId: VegetationIndexId) => void;
  onOpacityChange: (opacity: number) => void;
  onZonesChange: (zones: SpectralZone[] | null, legendIndexId: VegetationIndexId) => void;
  onActiveZoneChange: (zoneId: string | null) => void;
}) {
  const [payload, setPayload] = useState<SpectralOk<ParcelVegetationIndices> | SpectralLimited | null>(
    null,
  );
  const [zonesPayload, setZonesPayload] = useState<
    SpectralOk<ParcelSpectralZones> | SpectralLimited | null
  >(null);
  const [loading, setLoading] = useState(true);
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
  const onZonesChangeRef = useRef(onZonesChange);
  const onActiveZoneChangeRef = useRef(onActiveZoneChange);
  onZonesChangeRef.current = onZonesChange;
  onActiveZoneChangeRef.current = onActiveZoneChange;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPayload(null);

    void (async () => {
      const result = await fetchSpectral<ParcelVegetationIndices>(
        `/api/parcels/${parcel.id}/spectral/indices`,
      );
      if (!cancelled) {
        setPayload(result);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [parcel.id]);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryPayload(null);
    // Refresh history after indices load (upsert) or when parcel changes.
    const timer = window.setTimeout(() => {
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
    }, payload?.status === "OK" ? 150 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [parcel.id, payload?.status, historyRefresh]);

  useEffect(() => {
    let cancelled = false;
    setZonesLoading(true);
    setZonesPayload(null);
    onZonesChangeRef.current(null, selectedIndexId);
    onActiveZoneChangeRef.current(null);

    void (async () => {
      const result = await fetchSpectral<ParcelSpectralZones>(
        `/api/parcels/${encodeURIComponent(parcel.id)}/spectral/zones?index=${encodeURIComponent(selectedIndexId)}`,
      );
      if (cancelled) return;
      setZonesPayload(result);
      setZonesLoading(false);
      if (result.status === "OK") {
        onZonesChangeRef.current(result.data.zones, selectedIndexId);
      } else {
        onZonesChangeRef.current(null, selectedIndexId);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [parcel.id, selectedIndexId]);

  if (loading) {
    return <p className={styles.muted}>Cargando índices espectrales…</p>;
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
  const historyScenes =
    historyPayload?.status === "OK" ? historyPayload.data.scenes.length : 0;
  const showBackfillButton = !historyLoading && historyScenes <= 3;

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
        muestra raster CDSE cuando hay escena live; si no, grilla indicativa. Las
        zonas son medias relativas dentro de la parcela (fishnet). Requiere
        Intelligence Plus.
      </p>
      <p className={styles.muted}>
        Escena {data.acquisitionDate}
        <span className={styles.freshnessInline}>
          <Badge tone={freshnessTone(data.evidence.freshnessStatus)}>
            {data.evidence.freshnessStatus}
          </Badge>
        </span>
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
        <p className={styles.legendTitle}>Zonas · {selectedIndexId.toUpperCase()}</p>
        {zonesLoading ? (
          <p className={styles.muted}>Calculando zonas…</p>
        ) : null}
        {!zonesLoading && zonesPayload && zonesPayload.status !== "OK" ? (
          <p className={styles.muted}>{zonesPayload.message}</p>
        ) : null}
        {!zonesLoading && zonesOk ? (
          <ul className={styles.zoneList}>
            {zonesOk.zones.map((zone) => {
              const active = zone.id === activeZoneId;
              return (
                <li key={zone.id}>
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
            {historyPayload.data.scenes.length === 0 ? (
              <p className={styles.muted}>
                Sin escenas guardadas aún. Usa «Importar últimos 30 días» o consulta índices.
              </p>
            ) : (
              <>
                {(() => {
                  const spark = sparklinePoints(historyPayload.data.scenes, selectedIndexId);
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
                <ul className={styles.historyList}>
                  {[...historyPayload.data.scenes].reverse().slice(0, 8).map((scene) => {
                    const reading = scene.indices.find((item) => item.id === selectedIndexId);
                    return (
                      <li key={scene.id} className={styles.historyRow}>
                        <span className={styles.historyDate}>
                          <span>{scene.acquisitionDate}</span>
                          <span className={styles.historyCapture}>
                            Captura (satélite):{" "}
                            {formatSceneCapturedAt(scene.acquiredAt, parcel.timezone)}
                          </span>
                        </span>
                        <span className={styles.historyValue}>
                          {reading?.value == null ? "—" : reading.value.toFixed(2)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className={styles.zoneHint}>
                  {historyPayload.data.scenes.length} escena
                  {historyPayload.data.scenes.length === 1 ? "" : "s"} · últimos{" "}
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
          value={formatSceneCapturedAt(data.evidence.acquiredAt, parcel.timezone)}
        />
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
