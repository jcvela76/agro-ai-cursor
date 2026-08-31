"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  buildAgentSuggestedPrompts,
} from "@/content/agent/suggested-prompts";
import type { CropKey } from "@/domain/parcel/crop-catalog";
import type { ParcelAgronomicProfile } from "@/domain/parcel/agronomic-profile";
import type { Parcel } from "@/domain/parcel/types";
import { AgentChatExpandOverlay } from "@/ui/agent-chat/agent-chat-expand-overlay";
import { AgentChatView } from "@/ui/agent-chat/agent-chat-view";
import viewStyles from "@/ui/agent-chat/agent-chat-view.module.css";
import { mapAgentChatToViewMessages } from "@/ui/agent-chat/map-view-messages";
import { Button } from "@/ui/button";
import { ReportExportAction } from "@/ui/report-export-action";
import { StateBanner } from "@/ui/state-banner";
import { reportPilotError, trackPilotEvent } from "@/ui/pilot/track-pilot";
import styles from "./agent-chat-panel.module.css";

type LoadedChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  parts: Array<{ type: "text"; text: string }>;
};

export function AgentChatPanel({
  parcel,
  isAdmin,
}: {
  parcel: Parcel;
  isAdmin: boolean;
}) {
  const [plusEnabled, setPlusEnabled] = useState<boolean | null>(null);
  const [retentionDays, setRetentionDays] = useState<number | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [cropKey, setCropKey] = useState<CropKey | null>(null);

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

  const suggestions = useMemo(
    () => buildAgentSuggestedPrompts({ cropKey }),
    [cropKey],
  );

  useEffect(() => {
    let cancelled = false;
    setPlusEnabled(null);
    setRetentionDays(null);
    setHistoryLoaded(false);
    setInput("");
    setGateError(null);
    setExpanded(false);
    setCropKey(null);
    setMessages([]);

    (async () => {
      try {
        const [chatRes, profileRes] = await Promise.all([
          fetch(`/api/agent/chat?parcelId=${encodeURIComponent(parcel.id)}`),
          fetch(`/api/parcels/${encodeURIComponent(parcel.id)}/profile`),
        ]);
        const json = (await chatRes.json()) as {
          status: string;
          message?: string;
          data?: {
            plusEnabled: boolean;
            retentionDays?: number;
            messages?: LoadedChatMessage[];
          };
        };
        if (cancelled) return;

        if (profileRes.ok) {
          const profileJson = (await profileRes.json()) as {
            status: string;
            data?: ParcelAgronomicProfile;
          };
          if (profileJson.status === "OK" && profileJson.data?.cropKey) {
            setCropKey(profileJson.data.cropKey);
          }
        }

        if (json.status === "OK" && json.data) {
          setPlusEnabled(json.data.plusEnabled);
          setRetentionDays(json.data.retentionDays ?? null);
          if (json.data.plusEnabled && json.data.messages) {
            setMessages(
              json.data.messages.map((message) => ({
                id: message.id,
                role: message.role,
                parts: message.parts,
              })),
            );
          }
        } else {
          setPlusEnabled(false);
          setGateError(json.message ?? "No se pudo cargar el historial");
        }
      } catch {
        if (!cancelled) {
          setPlusEnabled(false);
        }
      } finally {
        if (!cancelled) {
          setHistoryLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [parcel.id, setMessages]);

  const busy = status === "submitted" || status === "streaming";

  const lastBriefing = useMemo(() => {
    let question = "";
    let answer = "";
    for (const message of messages) {
      if (message.role === "user") {
        const text = message.parts.find((part) => part.type === "text")?.text;
        if (text) question = text;
      }
      if (message.role === "assistant") {
        answer = message.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("\n");
      }
    }
    if (!question || !answer) return null;
    return { question, answer };
  }, [messages]);

  const sendText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setGateError(null);
    try {
      void trackPilotEvent("agent.chat_send", { parcelId: parcel.id });
      await sendMessage({ text: trimmed });
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo enviar";
      setGateError(message);
      void trackPilotEvent("agent.chat_fail", { parcelId: parcel.id });
      void reportPilotError({
        source: "agent.chat_send",
        message,
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
  };

  const onSend = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendText(text);
  };

  if (plusEnabled === null || !historyLoaded) {
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

  const viewMessages = mapAgentChatToViewMessages(messages, busy);

  const chatView = (
    <AgentChatView
      parcelName={parcel.name}
      retentionDays={retentionDays}
      messages={viewMessages}
      suggestions={suggestions}
      onSuggestionClick={(suggestion) => void sendText(suggestion.prompt)}
      busy={busy}
      layout={expanded ? "expanded" : "inline"}
      onExpand={() => setExpanded(true)}
      onCollapse={() => setExpanded(false)}
      messagesClassName={expanded ? viewStyles.messagesExpanded : undefined}
      footer={
        <>
          {lastBriefing && !busy ? (
            <ReportExportAction
              reportType="agent_briefing"
              label="Exportar respuesta como informe (PDF)"
              parcelId={parcel.id}
              agentQuestion={lastBriefing.question}
              agentAnswerMarkdown={lastBriefing.answer}
              isAdmin={isAdmin}
            />
          ) : null}
          {(error || gateError) && (
            <StateBanner
              title={gateError ?? error?.message ?? "Error del agente"}
              tone="error"
            />
          )}
        </>
      }
      composer={
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
      }
    />
  );

  return (
    <>
      {expanded ? (
        <p className={styles.expandedHint}>
          Chat ampliado abierto.{" "}
          <button type="button" className={styles.expandedHintBtn} onClick={() => setExpanded(false)}>
            Volver al panel
          </button>
        </p>
      ) : (
        chatView
      )}
      {expanded ? (
        <AgentChatExpandOverlay onClose={() => setExpanded(false)}>{chatView}</AgentChatExpandOverlay>
      ) : null}
    </>
  );
}
