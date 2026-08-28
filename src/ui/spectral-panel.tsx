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

      <div className={styles.evidence}>
        <EvidenceRow label="Fuente" value={data.evidence.sourceLabel} />
        <EvidenceRow label="Adquirido" value={data.evidence.acquiredAt} />
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
