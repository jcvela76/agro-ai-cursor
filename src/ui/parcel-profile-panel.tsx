"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Parcel } from "@/domain/parcel/types";
import type { ParcelAgronomicProfile } from "@/domain/parcel/agronomic-profile";
import { Button } from "@/ui/button";
import { StateBanner } from "@/ui/state-banner";
import styles from "./parcel-profile-panel.module.css";

type FormState = {
  crop: string;
  sowingDate: string;
  phenologyStage: string;
  irrigationSystem: string;
  irrigationFrequency: string;
  lastApplication: string;
  expectedHarvest: string;
  notes: string;
};

function profileToForm(p: ParcelAgronomicProfile): FormState {
  return {
    crop: p.crop ?? "",
    sowingDate: p.sowingDate ?? "",
    phenologyStage: p.phenologyStage ?? "",
    irrigationSystem: p.irrigationSystem ?? "",
    irrigationFrequency: p.irrigationFrequency ?? "",
    lastApplication: p.lastApplication ?? "",
    expectedHarvest: p.expectedHarvest ?? "",
    notes: p.notes ?? "",
  };
}

function emptyForm(): FormState {
  return {
    crop: "",
    sowingDate: "",
    phenologyStage: "",
    irrigationSystem: "",
    irrigationFrequency: "",
    lastApplication: "",
    expectedHarvest: "",
    notes: "",
  };
}

export function ParcelProfilePanel({
  parcel,
  isAdmin,
}: {
  parcel: Parcel;
  isAdmin: boolean;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const res = await fetch(`/api/parcels/${encodeURIComponent(parcel.id)}/profile`);
      const json = (await res.json()) as {
        status: string;
        data?: ParcelAgronomicProfile;
        message?: string;
      };
      if (res.status === 403 || json.status === "PROFILE_UNAVAILABLE") {
        setDenied(true);
        setError(json.message ?? "Perfil no disponible (requiere Plus).");
        return;
      }
      if (!res.ok || json.status !== "OK" || !json.data) {
        setError(json.message ?? "No se pudo cargar el perfil.");
        return;
      }
      setForm(profileToForm(json.data));
    } catch {
      setError("Error de red al cargar el perfil.");
    } finally {
      setLoading(false);
    }
  }, [parcel.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/parcels/${encodeURIComponent(parcel.id)}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crop: form.crop || null,
          sowingDate: form.sowingDate || null,
          phenologyStage: form.phenologyStage || null,
          irrigationSystem: form.irrigationSystem || null,
          irrigationFrequency: form.irrigationFrequency || null,
          lastApplication: form.lastApplication || null,
          expectedHarvest: form.expectedHarvest || null,
          notes: form.notes || null,
        }),
      });
      const json = (await res.json()) as {
        status: string;
        data?: ParcelAgronomicProfile;
        message?: string;
      };
      if (!res.ok || json.status !== "OK" || !json.data) {
        setError(json.message ?? "No se pudo guardar el perfil.");
        return;
      }
      setForm(profileToForm(json.data));
      setMessage("Perfil guardado.");
    } catch {
      setError("Error de red al guardar.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className={styles.muted}>Cargando perfil…</p>;
  }

  if (denied) {
    return (
      <div className={styles.root}>
        <StateBanner
          title="Perfil requiere Weather Intelligence Plus"
          detail="Cultivo, riego y siembra se guardan por parcela para orientar al agente."
          tone="unavailable"
        />
        {isAdmin ? (
          <a className={styles.link} href="/app/billing">
            Subir a Plus →
          </a>
        ) : (
          <p className={styles.muted}>Pide a un admin que active Plus.</p>
        )}
      </div>
    );
  }

  return (
    <form className={styles.root} onSubmit={(e) => void onSave(e)}>
      <p className={styles.intro}>
        Contexto agronómico de <strong>{parcel.name}</strong>. También se puede enriquecer
        desde el Agente.
      </p>

      <label className={styles.field}>
        <span>Cultivo / variedad</span>
        <input
          className={styles.input}
          value={form.crop}
          onChange={(e) => setField("crop", e.target.value)}
          placeholder="Ej. café arabica"
        />
      </label>
      <label className={styles.field}>
        <span>Fecha de siembra</span>
        <input
          className={styles.input}
          value={form.sowingDate}
          onChange={(e) => setField("sowingDate", e.target.value)}
          placeholder="YYYY-MM-DD o texto"
        />
      </label>
      <label className={styles.field}>
        <span>Etapa fenológica</span>
        <input
          className={styles.input}
          value={form.phenologyStage}
          onChange={(e) => setField("phenologyStage", e.target.value)}
          placeholder="Ej. floración"
        />
      </label>
      <label className={styles.field}>
        <span>Sistema de riego</span>
        <input
          className={styles.input}
          value={form.irrigationSystem}
          onChange={(e) => setField("irrigationSystem", e.target.value)}
          placeholder="Ej. goteo"
        />
      </label>
      <label className={styles.field}>
        <span>Frecuencia de riego</span>
        <input
          className={styles.input}
          value={form.irrigationFrequency}
          onChange={(e) => setField("irrigationFrequency", e.target.value)}
          placeholder="Ej. cada 3 días"
        />
      </label>
      <label className={styles.field}>
        <span>Última aplicación</span>
        <input
          className={styles.input}
          value={form.lastApplication}
          onChange={(e) => setField("lastApplication", e.target.value)}
        />
      </label>
      <label className={styles.field}>
        <span>Cosecha esperada</span>
        <input
          className={styles.input}
          value={form.expectedHarvest}
          onChange={(e) => setField("expectedHarvest", e.target.value)}
        />
      </label>
      <label className={styles.field}>
        <span>Notas</span>
        <textarea
          className={styles.textarea}
          value={form.notes}
          onChange={(e) => setField("notes", e.target.value)}
          rows={3}
        />
      </label>

      <div className={styles.actions}>
        <Button type="submit" disabled={busy}>
          {busy ? "Guardando…" : "Guardar perfil"}
        </Button>
      </div>
      {message ? <p className={styles.ok}>{message}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
    </form>
  );
}
