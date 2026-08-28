"use client";

import { useEffect, useState } from "react";
import type { Parcel } from "@/domain/parcel/types";
import type {
  WeatherForecast,
  WeatherLimitationReason,
  WeatherObservation,
} from "@/domain/weather/types";
import { Badge } from "@/ui/badge";
import { EvidenceRow } from "@/ui/evidence-row";
import { StateBanner } from "@/ui/state-banner";
import { ReportExportAction } from "@/ui/report-export-action";
import styles from "./weather-panel.module.css";

type WeatherOk<T> = { status: "OK"; data: T };
type WeatherLimited = {
  status: "WEATHER_LIMITED";
  reason: WeatherLimitationReason;
  message: string;
};

type Tab = "observation" | "forecast";

function freshnessTone(status: string): "fresh" | "stale" | "unknown" {
  if (status === "fresh") return "fresh";
  if (status === "stale") return "stale";
  return "unknown";
}

function limitationTone(reason: WeatherLimitationReason): "stale" | "unavailable" | "error" {
  if (reason === "stale") return "stale";
  if (reason === "internal_error") return "error";
  return "unavailable";
}

async function fetchWeather<T>(url: string): Promise<WeatherOk<T> | WeatherLimited> {
  const res = await fetch(url);
  return (await res.json()) as WeatherOk<T> | WeatherLimited;
}

export function WeatherPanel({ parcel, isAdmin }: { parcel: Parcel; isAdmin: boolean }) {
  const [tab, setTab] = useState<Tab>("observation");
  const [observation, setObservation] = useState<WeatherOk<WeatherObservation> | WeatherLimited | null>(
    null,
  );
  const [forecast, setForecast] = useState<WeatherOk<WeatherForecast> | WeatherLimited | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setObservation(null);
    setForecast(null);

    (async () => {
      const [obs, fc] = await Promise.all([
        fetchWeather<WeatherObservation>(`/api/parcels/${parcel.id}/weather/observation`),
        fetchWeather<WeatherForecast>(`/api/parcels/${parcel.id}/weather/forecast`),
      ]);
      if (!cancelled) {
        setObservation(obs);
        setForecast(fc);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [parcel.id]);

  return (
    <div className={styles.root}>
      <div className={styles.tabs} role="tablist" aria-label="Clima">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "observation"}
          className={tab === "observation" ? styles.tabActive : styles.tab}
          onClick={() => setTab("observation")}
        >
          Observación
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "forecast"}
          className={tab === "forecast" ? styles.tabActive : styles.tab}
          onClick={() => setTab("forecast")}
        >
          Pronóstico
        </button>
      </div>

      <div className={styles.tabContent}>
        {loading ? <p className={styles.muted}>Cargando evidencia…</p> : null}

        {!loading && tab === "observation" && observation ? (
          <ObservationView payload={observation} />
        ) : null}

        {!loading && tab === "forecast" && forecast ? <ForecastView payload={forecast} /> : null}
      </div>

      <ReportExportAction
        reportType="weather_climate"
        label="Generar informe climático (PDF)"
        parcelId={parcel.id}
        isAdmin={isAdmin}
        disabled={loading}
      />
      <ReportExportAction
        reportType="water_balance"
        label="Generar informe hídrico (PDF)"
        parcelId={parcel.id}
        isAdmin={isAdmin}
        disabled={loading}
      />
    </div>
  );
}

function ObservationView({
  payload,
}: {
  payload: WeatherOk<WeatherObservation> | WeatherLimited;
}) {
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
      <div className={styles.metricBlock}>
        <p className={styles.metric}>
          {data.temperatureCelsius.toFixed(1)}
          <span className={styles.unit}> °C</span>
        </p>
        <p className={styles.submetric}>
          Precipitación {data.precipitationMm.toFixed(1)} mm
          <span className={styles.freshnessInline}>
            {" · "}
            <Badge tone={freshnessTone(data.evidence.freshnessStatus)}>
              {data.evidence.freshnessStatus}
            </Badge>
          </span>
        </p>
      </div>
      <EvidenceBlock evidence={data.evidence} />
    </div>
  );
}

function ForecastView({
  payload,
}: {
  payload: WeatherOk<WeatherForecast> | WeatherLimited;
}) {
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
      <div className={styles.metricBlock}>
        <p className={styles.submetric}>
          Pronóstico 7 días
          <span className={styles.freshnessInline}>
            {" · "}
            <Badge tone={freshnessTone(data.evidence.freshnessStatus)}>
              {data.evidence.freshnessStatus}
            </Badge>
          </span>
        </p>
      </div>
      <ul className={styles.days}>
        {data.days.slice(0, 7).map((day) => (
          <li key={day.date} className={styles.day}>
            <span>{day.date}</span>
            <span>
              {day.tempMinCelsius.toFixed(0)}–{day.tempMaxCelsius.toFixed(0)} °C
            </span>
            <span>{day.precipitationMm.toFixed(1)} mm</span>
          </li>
        ))}
      </ul>
      <EvidenceBlock evidence={data.evidence} />
    </div>
  );
}

function EvidenceBlock({
  evidence,
}: {
  evidence: WeatherObservation["evidence"];
}) {
  return (
    <div className={styles.evidence}>
      <EvidenceRow label="Fuente" value={evidence.sourceLabel} />
      {evidence.observedAt ? (
        <EvidenceRow label="Observado" value={evidence.observedAt} />
      ) : null}
      {evidence.emittedAt ? <EvidenceRow label="Emitido" value={evidence.emittedAt} /> : null}
      {evidence.validFrom && evidence.validTo ? (
        <EvidenceRow label="Válido" value={`${evidence.validFrom} → ${evidence.validTo}`} />
      ) : null}
      <EvidenceRow label="Timezone" value={evidence.timezone} />
      <EvidenceRow
        label="Alcance"
        value={`${evidence.spatialScope.latitude.toFixed(4)}, ${evidence.spatialScope.longitude.toFixed(4)}`}
      />
      <EvidenceRow label="Política frescura" value={evidence.freshnessPolicy} />
    </div>
  );
}
