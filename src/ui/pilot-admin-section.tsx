"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./admin-panel.module.css";

type FeedbackRow = {
  id: string;
  kind: string;
  rating: string | null;
  flow: string | null;
  body: string;
  userId: string;
  createdAt: string;
};

type ErrorRow = {
  id: string;
  source: string;
  message: string;
  route: string | null;
  severity: string;
  userId: string | null;
  createdAt: string;
};

type EventCount = { eventName: string; count: number };

export function PilotAdminSection() {
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [events, setEvents] = useState<EventCount[]>([]);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const [fbRes, errRes] = await Promise.all([
          fetch("/api/pilot/feedback?limit=30"),
          fetch(`/api/pilot/errors?limit=30&days=${days}`),
        ]);
        const fbJson = (await fbRes.json()) as {
          ok?: boolean;
          data?: FeedbackRow[];
          error?: string;
        };
        const errJson = (await errRes.json()) as {
          ok?: boolean;
          data?: { errors: ErrorRow[]; eventCounts: EventCount[]; days: number };
          error?: string;
        };
        if (!cancelled) {
          if (fbRes.ok && fbJson.ok && fbJson.data) {
            setFeedback(fbJson.data);
          }
          if (errRes.ok && errJson.ok && errJson.data) {
            setErrors(errJson.data.errors);
            setEvents(errJson.data.eventCounts);
            setDays(errJson.data.days);
          }
          if ((!fbRes.ok || !fbJson.ok) && (!errRes.ok || !errJson.ok)) {
            setError(fbJson.error ?? errJson.error ?? "No se pudo cargar telemetría piloto.");
          }
        }
      } catch {
        if (!cancelled) {
          setError("No se pudo cargar telemetría piloto.");
        }
      } finally {
        if (!cancelled) {
          setBusy(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Piloto — feedback y fallos</h2>
      <p className={styles.muted}>
        Datos de esta organización. Los participantes envían desde{" "}
        <Link className={styles.inlineLink} href="/app/piloto">
          /app/piloto
        </Link>
        . Análisis ops: <code>docs/ops/pilot-program.md</code>.
      </p>

      <label className={styles.muted} style={{ display: "block", marginBottom: "0.75rem" }}>
        Ventana eventos:{" "}
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          style={{ marginLeft: "0.35rem" }}
        >
          <option value={7}>7 días</option>
          <option value={14}>14 días</option>
          <option value={30}>30 días</option>
        </select>
      </label>

      {busy ? <p className={styles.muted}>Cargando…</p> : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <h3 className={styles.sectionHeading}>Eventos ({days}d)</h3>
      {events.length === 0 && !busy ? (
        <p className={styles.muted}>Sin eventos aún.</p>
      ) : (
        <ul className={styles.checkList}>
          {events.map((row) => (
            <li key={row.eventName}>
              <code>{row.eventName}</code> · {row.count}
            </li>
          ))}
        </ul>
      )}

      <h3 className={styles.sectionHeading}>Feedback reciente</h3>
      {feedback.length === 0 && !busy ? (
        <p className={styles.muted}>Sin formularios enviados.</p>
      ) : (
        <ul className={styles.pilotList}>
          {feedback.map((row) => (
            <li key={row.id} className={styles.pilotItem}>
              <p className={styles.pilotMeta}>
                <strong>{row.kind}</strong>
                {row.rating ? ` · utilidad ${row.rating}` : ""}
                {row.flow ? ` · ${row.flow}` : ""}
                {" · "}
                {new Date(row.createdAt).toLocaleString("es-PE")}
              </p>
              <p className={styles.pilotBody}>{row.body}</p>
            </li>
          ))}
        </ul>
      )}

      <h3 className={styles.sectionHeading}>Errores recientes</h3>
      {errors.length === 0 && !busy ? (
        <p className={styles.muted}>Sin errores registrados.</p>
      ) : (
        <ul className={styles.pilotList}>
          {errors.map((row) => (
            <li key={row.id} className={styles.pilotItem}>
              <p className={styles.pilotMeta}>
                <strong>{row.severity}</strong> · <code>{row.source}</code>
                {row.route ? ` · ${row.route}` : ""}
                {" · "}
                {new Date(row.createdAt).toLocaleString("es-PE")}
              </p>
              <p className={styles.pilotBody}>{row.message}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
