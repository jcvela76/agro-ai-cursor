"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AGENT_SUGGESTED_PROMPTS } from "@/content/agent/suggested-prompts";
import type { Parcel } from "@/domain/parcel/types";
import {
  AgentChatView,
  type AgentChatViewMessage,
} from "@/ui/agent-chat/agent-chat-view";
import { Button } from "@/ui/button";
import { ReportExportAction } from "@/ui/report-export-action";
import { StateBanner } from "@/ui/state-banner";
import styles from "./agent-chat-panel.module.css";

type LoadedChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  parts: Array<{ type: "text"; text: string }>;
};

function toViewMessages(
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    parts: Array<{ type: string; text?: string }>;
  }>,
  busy: boolean,
): AgentChatViewMessage[] {
  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => {
      const toolParts = message.parts.filter((part) => part.type.startsWith("tool-"));
      const textParts = message.parts.filter((part) => part.type === "text");
      const text = textParts
        .map((part) => part.text ?? "")
        .join("\n")
        .trim();

      if (message.role === "user") {
        return {
          id: message.id,
          role: "user" as const,
          text,
        };
      }

      const isStreamingAssistant = busy && message.id === lastAssistantId;
      const hasToolActivity = toolParts.length > 0;

      return {
        id: message.id,
        role: "assistant" as const,
        text,
        toolNote: hasToolActivity ? "Consultando evidencia climática…" : null,
        showToolNoteWithText: isStreamingAssistant && hasToolActivity && !text,
        streaming: isStreamingAssistant,
      };
    });
}

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
    let cancelled = false;
    setPlusEnabled(null);
    setRetentionDays(null);
    setHistoryLoaded(false);
    setInput("");
    setGateError(null);
    setMessages([]);

    (async () => {
      try {
        const res = await fetch(
          `/api/agent/chat?parcelId=${encodeURIComponent(parcel.id)}`,
        );
        const json = (await res.json()) as {
          status: string;
          message?: string;
          data?: {
            plusEnabled: boolean;
            retentionDays?: number;
            messages?: LoadedChatMessage[];
          };
        };
        if (cancelled) return;

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
      await sendMessage({ text: trimmed });
    } catch (err) {
      setGateError(err instanceof Error ? err.message : "No se pudo enviar");
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

  const viewMessages = toViewMessages(messages, busy);

  return (
    <AgentChatView
      parcelName={parcel.name}
      retentionDays={retentionDays}
      messages={viewMessages}
      suggestions={AGENT_SUGGESTED_PROMPTS}
      onSuggestionClick={(suggestion) => void sendText(suggestion.prompt)}
      busy={busy}
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
}
