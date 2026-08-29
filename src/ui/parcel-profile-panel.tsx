"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Parcel } from "@/domain/parcel/types";
import type { ParcelAgronomicProfile } from "@/domain/parcel/agronomic-profile";
import { CROP_KEYS, CROP_LABELS, type CropKey } from "@/domain/parcel/crop-catalog";
import { Button } from "@/ui/button";
import { StateBanner } from "@/ui/state-banner";
import styles from "./parcel-profile-panel.module.css";

type FormState = {
  cropKey: CropKey | "";
  crop: string;
  sowingDate: string;
  phenologyStage: string;
  irrigationSystem: string;
  irrigationFrequency: string;
  lastApplication: string;
  expectedHarvest: string;
  notes: string;
  gddBaseCelsius: string;
};

function profileToForm(p: ParcelAgronomicProfile): FormState {
  return {
    cropKey: p.cropKey ?? "",
    crop: p.crop ?? "",
    sowingDate: p.sowingDate ?? "",
    phenologyStage: p.phenologyStage ?? "",
    irrigationSystem: p.irrigationSystem ?? "",
    irrigationFrequency: p.irrigationFrequency ?? "",
    lastApplication: p.lastApplication ?? "",
    expectedHarvest: p.expectedHarvest ?? "",
    notes: p.notes ?? "",
    gddBaseCelsius: p.gddBaseCelsius != null ? String(p.gddBaseCelsius) : "",
  };
}

function emptyForm(): FormState {
  return {
    cropKey: "",
    crop: "",
    sowingDate: "",
    phenologyStage: "",
    irrigationSystem: "",
    irrigationFrequency: "",
    lastApplication: "",
    expectedHarvest: "",
    notes: "",
    gddBaseCelsius: "",
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

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const gddRaw = form.gddBaseCelsius.trim();
      const res = await fetch(`/api/parcels/${encodeURIComponent(parcel.id)}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cropKey: form.cropKey || null,
          crop: form.crop || null,
          sowingDate: form.sowingDate || null,
          phenologyStage: form.phenologyStage || null,
          irrigationSystem: form.irrigationSystem || null,
          irrigationFrequency: form.irrigationFrequency || null,
          lastApplication: form.lastApplication || null,
          expectedHarvest: form.expectedHarvest || null,
          notes: form.notes || null,
          gddBaseCelsius: gddRaw === "" ? null : Number(gddRaw),
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
        desde el Agente. La fecha de siembra define la ventana de campaña (GDD/ET0/lluvia).
      </p>

      <label className={styles.field}>
        <span>Cultivo</span>
        <select
          className={styles.input}
          value={form.cropKey}
          onChange={(e) => setField("cropKey", e.target.value as CropKey | "")}
        >
          <option value="">— seleccionar —</option>
          {CROP_KEYS.map((key) => (
            <option key={key} value={key}>
              {CROP_LABELS[key]}
            </option>
          ))}
        </select>
      </label>
      {form.cropKey === "otro" || form.cropKey === "" ? (
        <label className={styles.field}>
          <span>Nombre / variedad (texto)</span>
          <input
            className={styles.input}
            value={form.crop}
            onChange={(e) => setField("crop", e.target.value)}
            placeholder="Ej. café arabica"
          />
        </label>
      ) : null}
      <label className={styles.field}>
        <span>Fecha de siembra</span>
        <input
          className={styles.input}
          type="date"
          value={form.sowingDate}
          onChange={(e) => setField("sowingDate", e.target.value)}
        />
      </label>
      <label className={styles.field}>
        <span>Etapa fenológica</span>
        <input
          className={styles.input}
          value={form.phenologyStage}
          onChange={(e) => setField("phenologyStage", e.target.value)}
          placeholder="Ej. floración / mid"
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
        <span>Base GDD °C (opcional)</span>
        <input
          className={styles.input}
          type="number"
          min={0}
          max={20}
          step={0.5}
          value={form.gddBaseCelsius}
          onChange={(e) => setField("gddBaseCelsius", e.target.value)}
          placeholder="Vacío = catálogo del cultivo"
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
