"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  PILOT_BUG_FLOWS,
  PILOT_CHECKLIST,
  PILOT_FEEDBACK_KINDS,
  type PilotFeedbackKind,
} from "@/content/pilot/checklist";
import { reportPilotError, trackPilotEvent } from "@/ui/pilot/track-pilot";
import styles from "./pilot-hub.module.css";

const CHECKLIST_STORAGE = "agro-ai-pilot-checklist-v1";

export function PilotHub() {
  const [kind, setKind] = useState<PilotFeedbackKind>("onboarding");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState("4");
  const [flow, setFlow] = useState<(typeof PILOT_BUG_FLOWS)[number]>("otro");
  const [role, setRole] = useState("");
  const [region, setRegion] = useState("");
  const [crop, setCrop] = useState("");
  const [hectares, setHectares] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void trackPilotEvent("pilot.hub_open");
    try {
      const raw = window.localStorage.getItem(CHECKLIST_STORAGE);
      if (raw) {
        setChecked(JSON.parse(raw) as Record<string, boolean>);
      }
    } catch {
      // ignore
    }
  }, []);

  function toggleCheck(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(CHECKLIST_STORAGE, JSON.stringify(next));
      } catch {
        // ignore
      }
      void trackPilotEvent("pilot.checklist_toggle", { id, done: next[id] });
      return next;
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/pilot/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          body,
          rating: kind === "weekly" ? rating : undefined,
          flow: kind === "bug" ? flow : undefined,
          role: kind === "onboarding" ? role : undefined,
          region: kind === "onboarding" ? region : undefined,
          crop: kind === "onboarding" ? crop : undefined,
          hectares: kind === "onboarding" ? hectares : undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error ?? "No se pudo enviar.");
        void reportPilotError({
          source: "pilot.feedback_submit",
          message: data.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      setStatus("ok");
      setMessage("Gracias — quedó registrado para el equipo piloto.");
      setBody("");
      void trackPilotEvent("pilot.feedback_submit", { kind });
    } catch (err) {
      setStatus("error");
      setMessage("No se pudo enviar. Intenta de nuevo.");
      void reportPilotError({
        source: "pilot.feedback_submit",
        message: err instanceof Error ? err.message : "network",
      });
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Piloto 2026</p>
        <h1 className={styles.title}>Centro del piloto</h1>
        <p className={styles.lead}>
          Guía corta, checklist de las primeras semanas y formularios. Los fallos y el
          feedback se guardan para análisis (sin spam al chat de soporte).
        </p>
        <p className={styles.links}>
          <Link href="/app">← Volver al mapa</Link>
          <a href="mailto:hola@geoagro.ai">hola@geoagro.ai</a>
        </p>
      </header>

      <section className={styles.card}>
        <h2>Qué hacer</h2>
        <ol className={styles.steps}>
          <li>Completá el formulario de <strong>Inicio</strong> (día 1).</li>
          <li>Probá clima, espectral y agente en tu parcela.</li>
          <li>Marcá el checklist; al fallar usá <strong>Reportar fallo</strong>.</li>
          <li>Fin de semana: <strong>Feedback semanal</strong>.</li>
        </ol>
        <p className={styles.note}>
          Recuerda: el copiloto orienta con evidencia; no prescribe dosis. Clima ≈ modelo
          ~9 km al polígono.
        </p>
      </section>

      <section className={styles.card}>
        <h2>Checklist</h2>
        <ul className={styles.checklist}>
          {PILOT_CHECKLIST.map((item) => (
            <li key={item.id}>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(checked[item.id])}
                  onChange={() => toggleCheck(item.id)}
                />
                <span>{item.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.card}>
        <h2>Formularios</h2>
        <div className={styles.kindTabs} role="tablist">
          {PILOT_FEEDBACK_KINDS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={kind === item.id}
              className={kind === item.id ? styles.kindActive : styles.kindBtn}
              onClick={() => {
                setKind(item.id);
                setStatus("idle");
                setMessage("");
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {status === "ok" ? (
          <p className={styles.ok}>{message}</p>
        ) : (
          <form className={styles.form} onSubmit={onSubmit}>
            {kind === "onboarding" ? (
              <div className={styles.grid3}>
                <input
                  className={styles.input}
                  placeholder="Rol"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  maxLength={80}
                />
                <input
                  className={styles.input}
                  placeholder="Región"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  maxLength={80}
                />
                <input
                  className={styles.input}
                  placeholder="Cultivo"
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  maxLength={80}
                />
                <input
                  className={styles.input}
                  placeholder="Ha aprox."
                  value={hectares}
                  onChange={(e) => setHectares(e.target.value)}
                  maxLength={40}
                />
              </div>
            ) : null}

            {kind === "weekly" ? (
              <label className={styles.field}>
                Utilidad esta semana (1–5)
                <select
                  className={styles.input}
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                >
                  {["1", "2", "3", "4", "5"].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {kind === "bug" ? (
              <label className={styles.field}>
                Flujo afectado
                <select
                  className={styles.input}
                  value={flow}
                  onChange={(e) => setFlow(e.target.value as (typeof PILOT_BUG_FLOWS)[number])}
                >
                  {PILOT_BUG_FLOWS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className={styles.field}>
              {kind === "bug"
                ? "Qué pasó y cómo reproducirlo"
                : kind === "weekly"
                  ? "Qué usaste, qué faltó, qué cambiarías"
                  : "Expectativa del piloto y cultivo / fundo"}
              <textarea
                className={styles.textarea}
                required
                minLength={8}
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={status === "loading"}
              />
            </label>

            {message && status === "error" ? (
              <p className={styles.err} role="status">
                {message}
              </p>
            ) : null}

            <button className={styles.submit} type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Enviando…" : "Enviar"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
