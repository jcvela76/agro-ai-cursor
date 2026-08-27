"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TraceLotView } from "@/domain/traceability/types";
import { StateBanner } from "@/ui/state-banner";
import styles from "./trace-lots-panel.module.css";

const EVENT_LABELS: Record<string, string> = {
  planted: "Siembra",
  harvested: "Cosecha",
  processed: "Procesamiento",
  exported: "Exportación",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  verified: "Verificado",
  exported: "Exportado",
};

export function TraceLotsPanel({
  parcelId,
  isAdmin,
}: {
  parcelId: string;
  isAdmin: boolean;
}) {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "denied" }
    | { kind: "error"; message: string }
    | { kind: "ok"; lots: TraceLotView[] }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/trace/lots");
        const json = (await res.json()) as {
          status: string;
          data?: TraceLotView[];
          message?: string;
        };
        if (cancelled) return;
        if (res.status === 403 || json.status === "TRACE_UNAVAILABLE") {
          setState({ kind: "denied" });
          return;
        }
        if (!res.ok || json.status !== "OK" || !json.data) {
          setState({
            kind: "error",
            message: json.message ?? "No se pudieron cargar los lotes.",
          });
          return;
        }
        setState({ kind: "ok", lots: json.data });
      } catch {
        if (!cancelled) {
          setState({ kind: "error", message: "No se pudieron cargar los lotes." });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") {
    return <p className={styles.muted}>Cargando lotes…</p>;
  }

  if (state.kind === "denied") {
    return (
      <div className={styles.gate}>
        <StateBanner
          title="Traceability requerido"
          detail="La lista de lotes solo está disponible con entitlement traceability."
          tone="unavailable"
        />
        {isAdmin ? (
          <Link className={styles.adminCta} href="/app/admin">
            Activar en Admin →
          </Link>
        ) : (
          <p className={styles.muted}>
            Pide a un admin del workspace que active Traceability.
          </p>
        )}
      </div>
    );
  }

  if (state.kind === "error") {
    return <StateBanner title="Error" detail={state.message} tone="unavailable" />;
  }

  if (state.lots.length === 0) {
    return <p className={styles.muted}>No hay lotes en este workspace.</p>;
  }

  return (
    <div className={styles.list}>
      <p className={styles.intro}>
        Lotes coffee del workspace (sin geometría). Destacados los vinculados a esta parcela.
      </p>
      <ul className={styles.lots}>
        {state.lots.map((view) => {
          const linkedHere = view.parcelLinks.some((l) => l.parcelId === parcelId);
          return (
            <li
              key={view.lot.id}
              className={linkedHere ? styles.lotLinked : styles.lot}
            >
              <div className={styles.lotHeader}>
                <strong>{view.lot.name}</strong>
                <span className={styles.badge}>
                  {STATUS_LABELS[view.lot.status] ?? view.lot.status}
                </span>
              </div>
              <p className={styles.meta}>
                {view.lot.cropType} · temporada {view.lot.harvestSeason}
                {linkedHere ? " · vinculado a esta parcela" : null}
              </p>
              {view.events.length > 0 ? (
                <ol className={styles.events}>
                  {view.events.map((evt) => (
                    <li key={evt.id}>
                      {EVENT_LABELS[evt.eventType] ?? evt.eventType}
                      <span className={styles.eventDate}>
                        {" "}
                        · {evt.occurredAt.slice(0, 10)}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.muted}>Sin eventos</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
