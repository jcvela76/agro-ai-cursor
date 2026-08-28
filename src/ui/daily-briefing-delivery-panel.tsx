"use client";

import { useCallback, useEffect, useState } from "react";
import type { Parcel } from "@/domain/parcel/types";
import type { DailyBriefingDeliveryPrefs } from "@/domain/report/daily-briefing-delivery";
import { Button } from "@/ui/button";
import styles from "./admin-panel.module.css";

export function DailyBriefingDeliveryPanel({ parcels }: { parcels: Parcel[] }) {
  const [prefs, setPrefs] = useState<DailyBriefingDeliveryPrefs | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [allParcels, setAllParcels] = useState(true);
  const [selectedParcelIds, setSelectedParcelIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/daily-briefing-delivery");
      const json = (await res.json()) as {
        status: string;
        data?: DailyBriefingDeliveryPrefs;
        message?: string;
      };
      if (!res.ok || json.status !== "OK" || !json.data) {
        setError(json.message ?? "No se pudieron cargar preferencias de envío.");
        return;
      }
      setPrefs(json.data);
      setEnabled(json.data.enabled);
      setEmailText(json.data.emailRecipients.join(", "));
      setAllParcels(json.data.parcelIds.length === 0);
      setSelectedParcelIds(json.data.parcelIds);
      setError(null);
    } catch {
      setError("No se pudieron cargar preferencias de envío.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleParcel = (id: string) => {
    setSelectedParcelIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const save = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);
    const emailRecipients = emailText
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/reports/daily-briefing-delivery", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          channels: ["email"],
          sendAtLocal: prefs?.sendAtLocal ?? "06:00",
          parcelIds: allParcels ? [] : selectedParcelIds,
          emailRecipients,
        }),
      });
      const json = (await res.json()) as {
        status: string;
        data?: DailyBriefingDeliveryPrefs;
        message?: string;
      };
      if (!res.ok || json.status !== "OK" || !json.data) {
        setError(json.message ?? "No se pudo guardar.");
        return;
      }
      setPrefs(json.data);
      setMessage(
        json.data.enabled
          ? "Envío matutino activado (≈06:00 America/Lima)."
          : "Envío matutino desactivado.",
      );
    } catch {
      setError("Error de red al guardar preferencias.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.section}>
      <h2>Briefing diario por email</h2>
      <p className={styles.muted}>
        Cada mañana (~06:00 America/Lima) genera el briefing de hoy si aún no existe y envía
        enlace + PDF a los destinatarios. Requiere Plus. WhatsApp: próximamente.
      </p>

      <label className={styles.check}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        <span>Enviar cada mañana por email</span>
      </label>

      <label className={styles.inviteLabel} htmlFor="briefing-emails" style={{ display: "block", marginTop: "1rem" }}>
        Destinatarios (separados por coma)
      </label>
      <input
        id="briefing-emails"
        className={styles.inviteInput}
        type="text"
        value={emailText}
        onChange={(e) => setEmailText(e.target.value)}
        placeholder="agronomo@ejemplo.com, admin@ejemplo.com"
        disabled={!enabled}
      />

      <p className={styles.muted} style={{ marginTop: "1rem" }}>
        Parcelas a incluir
      </p>
      <label className={styles.check}>
        <input
          type="radio"
          name="briefing-parcels"
          checked={allParcels}
          onChange={() => setAllParcels(true)}
          disabled={!enabled}
        />
        <span>Todas las parcelas del workspace</span>
      </label>
      <label className={styles.check}>
        <input
          type="radio"
          name="briefing-parcels"
          checked={!allParcels}
          onChange={() => setAllParcels(false)}
          disabled={!enabled}
        />
        <span>Solo parcelas seleccionadas</span>
      </label>
      {!allParcels ? (
        <ul className={styles.checkList}>
          {parcels.length === 0 ? (
            <li className={styles.muted}>No hay parcelas</li>
          ) : (
            parcels.map((p) => (
              <li key={p.id}>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={selectedParcelIds.includes(p.id)}
                    onChange={() => toggleParcel(p.id)}
                    disabled={!enabled}
                  />
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.id}</small>
                  </span>
                </label>
              </li>
            ))
          )}
        </ul>
      ) : null}

      <div className={styles.actions} style={{ marginTop: "1rem" }}>
        <Button type="button" onClick={() => void save()} disabled={busy}>
          {busy ? "Guardando…" : "Guardar envío matutino"}
        </Button>
      </div>
      {message ? <p className={styles.muted}>{message}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
    </section>
  );
}
