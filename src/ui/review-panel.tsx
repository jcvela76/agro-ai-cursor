"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  REVIEW_DECISION_KINDS,
  type ReviewDecision,
  type ReviewDecisionKind,
} from "@/domain/review/types";
import { Button } from "@/ui/button";
import { StateBanner } from "@/ui/state-banner";
import styles from "./review-panel.module.css";

const KIND_LABELS: Record<ReviewDecisionKind, string> = {
  observe: "Observación",
  recommend: "Recomendación",
  decide: "Decisión",
};

export function ReviewPanel({
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
    | { kind: "ok"; decisions: ReviewDecision[] }
  >({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [decisionKind, setDecisionKind] = useState<ReviewDecisionKind>("observe");
  const [summary, setSummary] = useState("");
  const [rationale, setRationale] = useState("");
  const [evidenceRef, setEvidenceRef] = useState("");

  const loadDecisions = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/review/decisions?parcelId=${encodeURIComponent(parcelId)}`,
      );
      const json = (await res.json()) as {
        status: string;
        data?: ReviewDecision[];
        message?: string;
      };
      if (res.status === 403 || json.status === "REVIEW_UNAVAILABLE") {
        setState({ kind: "denied" });
        return;
      }
      if (!res.ok || json.status !== "OK" || !json.data) {
        setState({
          kind: "error",
          message: json.message ?? "No se pudieron cargar las revisiones.",
        });
        return;
      }
      setState({ kind: "ok", decisions: json.data });
    } catch {
      setState({
        kind: "error",
        message: "No se pudieron cargar las revisiones.",
      });
    }
  }, [parcelId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadDecisions();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [loadDecisions]);

  async function onAppend(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/review/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parcelId,
          kind: decisionKind,
          summary,
          rationale,
          evidenceRef: evidenceRef.trim() || undefined,
        }),
      });
      const json = (await res.json()) as {
        status: string;
        message?: string;
      };
      if (!res.ok || json.status !== "OK") {
        setFormError(json.message ?? "No se pudo registrar la revisión.");
        return;
      }
      setSummary("");
      setRationale("");
      setEvidenceRef("");
      setDecisionKind("observe");
      await loadDecisions();
    } catch {
      setFormError("No se pudo registrar la revisión.");
    } finally {
      setBusy(false);
    }
  }

  if (state.kind === "loading") {
    return <p className={styles.intro}>Cargando revisiones…</p>;
  }

  if (state.kind === "denied") {
    return (
      <div className={styles.list}>
        <StateBanner
          title="Agronomic Review requerido"
          detail={
            isAdmin ? (
              <>
                Actívalo en <Link href="/admin">Admin</Link> (entitlement{" "}
                <code>agronomic_review</code>).
              </>
            ) : (
              "Pide al operador del workspace que active Agronomic Review."
            )
          }
          tone="unavailable"
        />
      </div>
    );
  }

  if (state.kind === "error") {
    return <StateBanner title="Error" detail={state.message} tone="unavailable" />;
  }

  return (
    <div className={styles.list}>
      <p className={styles.intro}>
        Decisiones humanas append-only vinculadas a esta parcela. No se editan ni
        borran (Review-1).
      </p>

      <ul className={styles.decisions}>
        {state.decisions.length === 0 ? (
          <li className={styles.empty}>Sin revisiones aún para esta parcela.</li>
        ) : (
          state.decisions.map((d) => (
            <li key={d.id} className={styles.decision}>
              <div className={styles.decisionHeader}>
                <span className={styles.badge}>{KIND_LABELS[d.kind]}</span>
                <time dateTime={d.decidedAt} className={styles.when}>
                  {new Date(d.decidedAt).toLocaleString("es-PE", {
                    timeZone: "America/Lima",
                  })}
                </time>
              </div>
              <p className={styles.summary}>{d.summary}</p>
              <p className={styles.rationale}>{d.rationale}</p>
              {d.evidenceRef ? (
                <p className={styles.meta}>Evidencia: {d.evidenceRef}</p>
              ) : null}
            </li>
          ))
        )}
      </ul>

      <form className={styles.form} onSubmit={(e) => void onAppend(e)}>
        <h3 className={styles.formTitle}>Registrar revisión</h3>
        {formError ? (
          <StateBanner title="No se guardó" detail={formError} tone="unavailable" />
        ) : null}
        <label className={styles.label}>
          Tipo
          <select
            value={decisionKind}
            onChange={(e) =>
              setDecisionKind(e.target.value as ReviewDecisionKind)
            }
            disabled={busy}
          >
            {REVIEW_DECISION_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.label}>
          Resumen
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            required
            maxLength={200}
            disabled={busy}
            placeholder="Qué se observó o decidió"
          />
        </label>
        <label className={styles.label}>
          Rationale
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            required
            rows={3}
            maxLength={2000}
            disabled={busy}
            placeholder="Por qué, con qué evidencia"
          />
        </label>
        <label className={styles.label}>
          Ref. evidencia (opcional)
          <input
            value={evidenceRef}
            onChange={(e) => setEvidenceRef(e.target.value)}
            maxLength={200}
            disabled={busy}
            placeholder="nota-campo-…"
          />
        </label>
        <Button type="submit" disabled={busy || !summary.trim() || !rationale.trim()}>
          Append
        </Button>
      </form>
    </div>
  );
}
