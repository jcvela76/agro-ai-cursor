"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import styles from "./landing.module.css";

const WAITLIST_ROLES = [
  { value: "", label: "Rol (opcional)" },
  { value: "productor", label: "Productor/a" },
  { value: "tecnico", label: "Técnico/a de campo" },
  { value: "consultor", label: "Consultor/a" },
  { value: "exportador", label: "Exportador/a" },
  { value: "otro", label: "Otro" },
] as const;

type Props = {
  dark?: boolean;
  id?: string;
  hint?: string;
};

export function WaitlistForm({
  dark = false,
  id,
  hint = "Sin tarjeta · respondemos en 48 h hábiles en días laborables.",
}: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [region, setRegion] = useState("");
  const [crop, setCrop] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role: role || undefined,
          region: region || undefined,
          crop: crop || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error ?? "No se pudo registrar. Intenta de nuevo.");
        return;
      }
      setStatus("ok");
      setMessage("✓ Anotado. Te escribimos en cuanto abramos acceso.");
      setEmail("");
      setRole("");
      setRegion("");
      setCrop("");
    } catch {
      setStatus("error");
      setMessage("No se pudo registrar. Intenta de nuevo.");
    }
  }

  if (status === "ok") {
    return <p className={styles.waitlistOk}>{message}</p>;
  }

  const inputId = id ? `${id}-email` : "waitlist-email";
  const roleId = id ? `${id}-role` : "waitlist-role";
  const regionId = id ? `${id}-region` : "waitlist-region";
  const cropId = id ? `${id}-crop` : "waitlist-crop";

  return (
    <form
      id={id}
      className={`${styles.waitlistForm} ${dark ? styles.waitlistDark : ""}`}
      onSubmit={onSubmit}
      noValidate
    >
      <div className={styles.waitlistPrimaryRow}>
        <label className={styles.srOnly} htmlFor={inputId}>
          Correo electrónico
        </label>
        <input
          id={inputId}
          className={styles.waitlistInput}
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading"}
        />
        <button
          className={styles.btnPrimary}
          type="submit"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Enviando…" : "Solicitar acceso →"}
        </button>
      </div>

      <div className={styles.waitlistQualifiers}>
        <label className={styles.srOnly} htmlFor={roleId}>
          Rol
        </label>
        <select
          id={roleId}
          className={styles.waitlistSelect}
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={status === "loading"}
        >
          {WAITLIST_ROLES.map((option) => (
            <option key={option.value || "empty"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label className={styles.srOnly} htmlFor={regionId}>
          Región
        </label>
        <input
          id={regionId}
          className={styles.waitlistInput}
          type="text"
          name="region"
          autoComplete="address-level1"
          placeholder="Región (opcional)"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          disabled={status === "loading"}
          maxLength={80}
        />
        <label className={styles.srOnly} htmlFor={cropId}>
          Cultivo principal
        </label>
        <input
          id={cropId}
          className={styles.waitlistInput}
          type="text"
          name="crop"
          placeholder="Cultivo (opcional)"
          value={crop}
          onChange={(e) => setCrop(e.target.value)}
          disabled={status === "loading"}
          maxLength={80}
        />
      </div>

      {message ? (
        <p className={styles.waitlistError} role="status">
          {message}
        </p>
      ) : (
        <span className={styles.waitlistHintMobile}>{hint}</span>
      )}
      <p className={styles.waitlistConsent}>
        Al inscribirte aceptas nuestra{" "}
        <Link href="/legal/privacy">Política de privacidad</Link> y los{" "}
        <Link href="/legal/terms">Términos de servicio</Link>.
      </p>
    </form>
  );
}
