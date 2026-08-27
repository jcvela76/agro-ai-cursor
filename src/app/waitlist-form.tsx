"use client";

import { useState, type FormEvent } from "react";
import styles from "../landing.module.css";

type Props = {
  variant?: "hero" | "closing";
  id?: string;
};

export function WaitlistForm({ variant = "hero", id }: Props) {
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
      setMessage("Listo. Te avisamos cuando abra el piloto.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("No se pudo registrar. Intenta de nuevo.");
    }
  }

  return (
    <form
      id={id}
      className={variant === "hero" ? styles.waitlistHero : styles.waitlistClosing}
      onSubmit={onSubmit}
      noValidate
    >
      <label className={styles.srOnly} htmlFor={id ? `${id}-email` : "waitlist-email"}>
        Correo electrónico
      </label>
      <input
        id={id ? `${id}-email` : "waitlist-email"}
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
      <button className={styles.cta} type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Enviando…" : "Inscribirse en lista de espera"}
      </button>
      {message ? (
        <p
          className={status === "ok" ? styles.waitlistOk : styles.waitlistError}
          role="status"
        >
          {message}
        </p>
      ) : (
        <p className={styles.waitlistHint}>Te avisamos cuando lancemos el piloto. Sin cobro.</p>
      )}
    </form>
  );
}
