"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Parcel } from "@/domain/parcel/types";
import type { ParcelFieldNote } from "@/domain/field-note/types";
import { Button } from "@/ui/button";
import { StateBanner } from "@/ui/state-banner";
import styles from "./field-log-panel.module.css";

function toDatetimeLocalValue(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatObservedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-PE", {
      timeZone: "America/Lima",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function shortAuthor(userId: string): string {
  if (userId.length <= 12) return userId;
  return `${userId.slice(0, 6)}…${userId.slice(-4)}`;
}

export function FieldLogPanel({
  parcel,
  isAdmin,
}: {
  parcel: Parcel;
  isAdmin: boolean;
}) {
  const [notes, setNotes] = useState<ParcelFieldNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [zoneLabel, setZoneLabel] = useState("");
  const [observedAt, setObservedAt] = useState(toDatetimeLocalValue);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const res = await fetch(
        `/api/parcels/${encodeURIComponent(parcel.id)}/field-notes`,
      );
      const json = (await res.json()) as {
        status: string;
        data?: ParcelFieldNote[];
        message?: string;
      };
      if (res.status === 403 || json.status === "FIELD_NOTES_UNAVAILABLE") {
        setDenied(true);
        setError(json.message ?? "Bitácora no disponible (requiere Plus).");
        return;
      }
      if (!res.ok || json.status !== "OK" || !json.data) {
        setError(json.message ?? "No se pudo cargar la bitácora.");
        return;
      }
      setNotes(json.data);
    } catch {
      setError("Error de red al cargar la bitácora.");
    } finally {
      setLoading(false);
    }
  }, [parcel.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const observedIso = observedAt
        ? new Date(observedAt).toISOString()
        : undefined;
      const res = await fetch(
        `/api/parcels/${encodeURIComponent(parcel.id)}/field-notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body,
            zoneLabel: zoneLabel.trim() || null,
            observedAt: observedIso,
          }),
        },
      );
      const json = (await res.json()) as {
        status: string;
        data?: ParcelFieldNote;
        message?: string;
      };
      if (!res.ok || json.status !== "OK" || !json.data) {
        setError(json.message ?? "No se pudo guardar la nota.");
        return;
      }
      setNotes((prev) => [json.data!, ...prev]);
      setBody("");
      setZoneLabel("");
      setObservedAt(toDatetimeLocalValue());
      setMessage("Nota de campo guardada.");
    } catch {
      setError("Error de red al guardar.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className={styles.muted}>Cargando bitácora…</p>;
  }

  if (denied) {
    return (
      <div className={styles.root}>
        <StateBanner
          title="Bitácora requiere Weather Intelligence Plus"
          detail="Notas de inspección por parcela para contrastar con clima y espectral."
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
    <div className={styles.root}>
      <p className={styles.intro}>
        Bitácora de <strong>{parcel.name}</strong>. Notas rápidas de campo (no sustituyen
        Revisión formal). Fotos: próximamente.
      </p>

      <form className={styles.composer} onSubmit={(e) => void onSave(e)}>
        <label className={styles.field}>
          <span>Nota</span>
          <textarea
            className={styles.textarea}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ej. Estrés visible en zona SO; suelo seco a 10 cm"
            rows={3}
            required
            maxLength={2000}
          />
        </label>
        <div className={styles.row}>
          <label className={styles.field}>
            <span>Zona (opcional)</span>
            <input
              className={styles.input}
              value={zoneLabel}
              onChange={(e) => setZoneLabel(e.target.value)}
              placeholder="Ej. SO / NE / borde"
              maxLength={80}
            />
          </label>
          <label className={styles.field}>
            <span>Fecha / hora</span>
            <input
              className={styles.input}
              type="datetime-local"
              value={observedAt}
              onChange={(e) => setObservedAt(e.target.value)}
            />
          </label>
        </div>
        <div className={styles.actions}>
          <Button type="submit" disabled={busy || !body.trim()}>
            {busy ? "Guardando…" : "Añadir nota"}
          </Button>
        </div>
        {message ? <p className={styles.ok}>{message}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}
      </form>

      <div className={styles.list} aria-live="polite">
        {notes.length === 0 ? (
          <p className={styles.muted}>Sin notas aún. Registra la primera inspección.</p>
        ) : (
          notes.map((note) => (
            <article key={note.id} className={styles.note}>
              <header className={styles.noteMeta}>
                <time dateTime={note.observedAt}>{formatObservedAt(note.observedAt)}</time>
                {note.zoneLabel ? (
                  <span className={styles.zone}>{note.zoneLabel}</span>
                ) : null}
                <span className={styles.author}>{shortAuthor(note.authorUserId)}</span>
              </header>
              <p className={styles.noteBody}>{note.body}</p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
