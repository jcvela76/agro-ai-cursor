"use client";

import { useEffect, useState } from "react";
import type { Parcel } from "@/domain/parcel/types";
import type {
  ParcelVegetationIndices,
  SpectralLimitationReason,
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

function freshnessTone(status: string): "fresh" | "stale" | "unknown" {
  if (status === "fresh") return "fresh";
  if (status === "stale") return "stale";
  return "unknown";
}

async function fetchSpectral<T>(url: string): Promise<SpectralOk<T> | SpectralLimited> {
  const res = await fetch(url);
  return (await res.json()) as SpectralOk<T> | SpectralLimited;
}

export function SpectralPanel({ parcel }: { parcel: Parcel }) {
  const [payload, setPayload] = useState<SpectralOk<ParcelVegetationIndices> | SpectralLimited | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

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
        detail={payload.reason}
        tone={limitationTone(payload.reason)}
      />
    );
  }

  const { data } = payload;
  return (
    <div className={styles.content}>
      <p className={styles.intro}>
        Índices de vegetación derivados de reflectancia multiespectral. Requiere Intelligence Plus.
        Valores entre −1 y 1 salvo indicación del método.
      </p>
      <p className={styles.muted}>
        Escena {data.acquisitionDate}
        <span className={styles.freshnessInline}>
          <Badge tone={freshnessTone(data.evidence.freshnessStatus)}>
            {data.evidence.freshnessStatus}
          </Badge>
        </span>
      </p>
      <ul className={styles.list}>
        {data.indices.map((index) => (
          <li key={index.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.indexLabel}>{index.label}</p>
              <p className={styles.indexValue}>
                {index.value === null ? "—" : index.value.toFixed(3)}
              </p>
            </div>
            <p className={styles.indexDescription}>{index.description}</p>
          </li>
        ))}
      </ul>
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
