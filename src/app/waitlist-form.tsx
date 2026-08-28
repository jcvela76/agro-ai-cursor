"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import styles from "./landing.module.css";

type Props = {
  dark?: boolean;
  id?: string;
  hint?: string;
};

export function WaitlistForm({
  dark = false,
  id,
  hint = "Te avisamos cuando abra el piloto.",
}: Props) {
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ email }),
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
    } catch {
      setStatus("error");
      setMessage("No se pudo registrar. Intenta de nuevo.");
    }
  }

  if (status === "ok") {
    return <p className={styles.waitlistOk}>{message}</p>;
  }

  const inputId = id ? `${id}-email` : "waitlist-email";

  return (
    <form
      id={id}
      className={`${styles.waitlistForm} ${dark ? styles.waitlistDark : ""}`}
      onSubmit={onSubmit}
      noValidate
    >
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
        {status === "loading" ? "Enviando…" : "Inscribirse →"}
      </button>
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
