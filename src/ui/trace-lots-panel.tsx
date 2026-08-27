"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  TRACE_EVENT_TYPES,
  type TraceEventType,
  type TraceLotView,
} from "@/domain/traceability/types";
import { Button } from "@/ui/button";
import { StateBanner } from "@/ui/state-banner";
import styles from "./trace-lots-panel.module.css";

const EVENT_LABELS: Record<TraceEventType, string> = {
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

function todayDateInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lotName, setLotName] = useState("");
  const [harvestSeason, setHarvestSeason] = useState(String(new Date().getFullYear()));
  const [linkParcel, setLinkParcel] = useState(true);
  const [eventLotId, setEventLotId] = useState<string | null>(null);
  const [eventType, setEventType] = useState<TraceEventType>("planted");
  const [eventDate, setEventDate] = useState(todayDateInput);
  const [evidenceRef, setEvidenceRef] = useState("");

  const loadLots = useCallback(async () => {
    try {
      const res = await fetch("/api/trace/lots");
      const json = (await res.json()) as {
        status: string;
        data?: TraceLotView[];
        message?: string;
      };
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
      setState({ kind: "error", message: "No se pudieron cargar los lotes." });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadLots();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [loadLots]);

  const createLot = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/trace/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: lotName,
          harvestSeason,
          cropType: "coffee",
          parcelId: linkParcel ? parcelId : null,
        }),
      });
      const json = (await res.json()) as {
        status: string;
        message?: string;
        data?: TraceLotView;
      };
      if (!res.ok || json.status !== "OK" || !json.data) {
        setFormError(json.message ?? "No se pudo crear el lote.");
        return;
      }
      setLotName("");
      setState((prev) =>
        prev.kind === "ok"
          ? { kind: "ok", lots: [...prev.lots, json.data!] }
          : { kind: "ok", lots: [json.data!] },
      );
    } catch {
      setFormError("No se pudo crear el lote.");
    } finally {
      setBusy(false);
    }
  };

  const appendEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!eventLotId) return;
    setFormError(null);
    setBusy(true);
    try {
      const occurredAt = `${eventDate}T12:00:00-05:00`;
      const res = await fetch(`/api/trace/lots/${eventLotId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          occurredAt,
          evidenceRef: evidenceRef.trim() || null,
        }),
      });
      const json = (await res.json()) as {
        status: string;
        message?: string;
        data?: TraceLotView;
      };
      if (!res.ok || json.status !== "OK" || !json.data) {
        setFormError(json.message ?? "No se pudo añadir el evento.");
        return;
      }
      setEvidenceRef("");
      setEventLotId(null);
      setState((prev) => {
        if (prev.kind !== "ok") return prev;
        return {
          kind: "ok",
          lots: prev.lots.map((v) => (v.lot.id === json.data!.lot.id ? json.data! : v)),
        };
      });
    } catch {
      setFormError("No se pudo añadir el evento.");
    } finally {
      setBusy(false);
    }
  };

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

  return (
    <div className={styles.list}>
      <p className={styles.intro}>
        Lotes coffee del workspace (sin geometría). Destacados los vinculados a esta
        parcela.
      </p>

      <form className={styles.form} onSubmit={createLot}>
        <p className={styles.formTitle}>Nuevo lote</p>
        <label className={styles.field}>
          Nombre
          <input
            value={lotName}
            onChange={(ev) => setLotName(ev.target.value)}
            required
            maxLength={120}
            disabled={busy}
          />
        </label>
        <label className={styles.field}>
          Temporada
          <input
            value={harvestSeason}
            onChange={(ev) => setHarvestSeason(ev.target.value)}
            required
            maxLength={16}
            disabled={busy}
          />
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={linkParcel}
            onChange={(ev) => setLinkParcel(ev.target.checked)}
            disabled={busy}
          />
          Vincular a esta parcela
        </label>
        <Button type="submit" disabled={busy || !lotName.trim()}>
          Crear lote
        </Button>
      </form>

      {formError ? (
        <StateBanner title="No se guardó" detail={formError} tone="unavailable" />
      ) : null}

      {state.lots.length === 0 ? (
        <p className={styles.muted}>No hay lotes en este workspace.</p>
      ) : (
        <ul className={styles.lots}>
          {state.lots.map((view) => {
            const linkedHere = view.parcelLinks.some((l) => l.parcelId === parcelId);
            const adding = eventLotId === view.lot.id;
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

                {adding ? (
                  <form className={styles.eventForm} onSubmit={appendEvent}>
                    <label className={styles.field}>
                      Tipo
                      <select
                        value={eventType}
                        onChange={(ev) =>
                          setEventType(ev.target.value as TraceEventType)
                        }
                        disabled={busy}
                      >
                        {TRACE_EVENT_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {EVENT_LABELS[t]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.field}>
                      Fecha
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(ev) => setEventDate(ev.target.value)}
                        required
                        disabled={busy}
                      />
                    </label>
                    <label className={styles.field}>
                      Evidencia (opcional)
                      <input
                        value={evidenceRef}
                        onChange={(ev) => setEvidenceRef(ev.target.value)}
                        placeholder="ref o URI"
                        maxLength={200}
                        disabled={busy}
                      />
                    </label>
                    <div className={styles.formActions}>
                      <Button type="submit" disabled={busy}>
                        Guardar evento
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setEventLotId(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    className={styles.linkBtn}
                    disabled={busy}
                    onClick={() => {
                      setFormError(null);
                      setEventLotId(view.lot.id);
                      setEventType("planted");
                      setEventDate(todayDateInput());
                      setEvidenceRef("");
                    }}
                  >
                    Añadir evento
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
