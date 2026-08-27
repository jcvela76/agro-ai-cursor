"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Parcel } from "@/domain/parcel/types";
import { Button } from "@/ui/button";
import { StateBanner } from "@/ui/state-banner";
import styles from "./agent-chat-panel.module.css";

export function AgentChatPanel({
  parcel,
  isAdmin,
}: {
  parcel: Parcel;
  isAdmin: boolean;
}) {
  const [plusEnabled, setPlusEnabled] = useState<boolean | null>(null);
  const [input, setInput] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/agent/chat");
        const json = (await res.json()) as {
          status: string;
          data?: { plusEnabled: boolean };
        };
        if (!cancelled && json.status === "OK" && json.data) {
          setPlusEnabled(json.data.plusEnabled);
        }
      } catch {
        if (!cancelled) {
          setPlusEnabled(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [parcel.id]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent/chat",
        body: { parcelId: parcel.id },
      }),
    [parcel.id],
  );

  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: `agro-agent-${parcel.id}`,
    transport,
  });

  useEffect(() => {
    setMessages([]);
    setInput("");
    setGateError(null);
  }, [parcel.id, setMessages]);

  const busy = status === "submitted" || status === "streaming";

  const onSend = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setGateError(null);
    try {
      await sendMessage({ text });
    } catch (err) {
      setGateError(err instanceof Error ? err.message : "No se pudo enviar");
    }
  };

  if (plusEnabled === null) {
    return <p className={styles.muted}>Comprobando Plus…</p>;
  }

  if (!plusEnabled) {
    return (
      <div className={styles.gate}>
        <StateBanner
          title="Weather Intelligence Plus requerido"
          detail="El Agro Agent solo está disponible con entitlement weather_plus."
          tone="unavailable"
        />
        {isAdmin ? (
          <Link className={styles.adminCta} href="/app/admin">
            Activar en Admin →
          </Link>
        ) : (
          <p className={styles.muted}>Pide a un admin del workspace que active Plus.</p>
        )}
      </div>
    );
  }

  return (
    <div className={styles.chat}>
      <p className={styles.intro}>
        Pregunta sobre observación o pronóstico de <strong>{parcel.name}</strong>. Cito fuente y
        frescura; no invento datos.
      </p>

      <div className={styles.messages} aria-live="polite">
        {messages.length === 0 ? (
          <p className={styles.muted}>Ej.: ¿Cuál es la última temperatura disponible?</p>
        ) : null}
        {messages.map((message) => (
          <div
            key={message.id}
            className={message.role === "user" ? styles.userBubble : styles.assistantBubble}
          >
            {message.parts.map((part, index) => {
              if (part.type === "text") {
                return (
                  <p key={`${message.id}-${index}`} className={styles.bubbleText}>
                    {part.text}
                  </p>
                );
              }
              if (part.type.startsWith("tool-")) {
                return (
                  <p key={`${message.id}-${index}`} className={styles.toolNote}>
                    Consultando evidencia climática…
                  </p>
                );
              }
              return null;
            })}
          </div>
        ))}
      </div>

      {(error || gateError) && (
        <StateBanner
          title={gateError ?? error?.message ?? "Error del agente"}
          tone="error"
        />
      )}

      <form
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault();
          void onSend();
        }}
      >
        <input
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta…"
          disabled={busy}
          aria-label="Mensaje al Agro Agent"
        />
        <Button type="submit" disabled={busy || !input.trim()}>
          Enviar
        </Button>
      </form>
    </div>
  );
}
