"use client";

import type { ReactNode } from "react";
import { AgentMessageContent } from "@/ui/agent-message-content";
import styles from "./agent-chat-view.module.css";

export type AgentChatViewMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  toolNote?: string | null;
  /** Keep tool note visible while assistant text is still streaming in. */
  showToolNoteWithText?: boolean;
  /** Render plain text until the stream finishes (avoids broken HTML/tables mid-chunk). */
  streaming?: boolean;
};

export type AgentChatSuggestion = {
  id: string;
  label: string;
  prompt: string;
  active?: boolean;
};

export function AgentChatView({
  parcelName,
  retentionDays,
  messages,
  suggestions,
  onSuggestionClick,
  suggestionExtras,
  busy = false,
  emptyState,
  composer,
  footer,
  messagesClassName,
  messagesMaxHeight,
  className = "",
  layout = "inline",
  onExpand,
  onCollapse,
}: {
  parcelName: string;
  retentionDays?: number | null;
  messages: AgentChatViewMessage[];
  suggestions?: ReadonlyArray<AgentChatSuggestion>;
  onSuggestionClick?: (suggestion: AgentChatSuggestion) => void;
  suggestionExtras?: ReactNode;
  busy?: boolean;
  /** Pass `false` to hide the empty placeholder (e.g. landing demo idle). */
  emptyState?: ReactNode | false;
  composer: ReactNode;
  footer?: ReactNode;
  messagesClassName?: string;
  messagesMaxHeight?: string;
  className?: string;
  layout?: "inline" | "expanded";
  onExpand?: () => void;
  onCollapse?: () => void;
}) {
  const showSuggestions = suggestions != null && suggestions.length > 0;
  const shellClass = [
    styles.shell,
    layout === "expanded" ? styles.shellExpanded : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass}>
      <div className={styles.introRow}>
        <p className={styles.intro}>
          Pregunta sobre observación o pronóstico de <strong>{parcelName}</strong>. Cito fuente y
          frescura; no invento datos.
        </p>
        <div className={styles.introActions}>
          {retentionDays != null && retentionDays > 0 ? (
            <span className={styles.retentionBadge}>Historial · {retentionDays} días</span>
          ) : null}
          {layout === "inline" && onExpand ? (
            <button
              type="button"
              className={styles.chromeBtn}
              onClick={onExpand}
              aria-label="Agrandar chat del agente"
            >
              Agrandar
            </button>
          ) : null}
          {layout === "expanded" && onCollapse ? (
            <button
              type="button"
              className={styles.chromeBtn}
              onClick={onCollapse}
              aria-label="Cerrar ventana ampliada"
            >
              Cerrar
            </button>
          ) : null}
        </div>
      </div>

      <div
        className={`${styles.messages} ${messagesClassName ?? ""}`.trim()}
        style={messagesMaxHeight ? { maxHeight: messagesMaxHeight } : undefined}
        aria-live="polite"
      >
        {messages.length === 0
          ? emptyState === false
            ? null
            : (emptyState ?? (
                <p className={styles.emptyState}>
                  Sin mensajes en la ventana de retención. Elige una sugerencia o escribe tu
                  pregunta.
                </p>
              ))
          : null}
        {messages.map((message) => {
          const showToolNote =
            message.role === "assistant" &&
            message.toolNote &&
            (!message.text || message.showToolNoteWithText);

          return (
            <div
              key={message.id}
              className={message.role === "user" ? styles.userBubble : styles.assistantBubble}
            >
              {showToolNote ? <p className={styles.toolNote}>{message.toolNote}</p> : null}
              {message.role === "assistant" && message.text ? (
                message.streaming ? (
                  <p className={styles.bubbleText}>{message.text}</p>
                ) : (
                  <AgentMessageContent text={message.text} />
                )
              ) : null}
              {message.role === "user" ? (
                <p className={styles.bubbleText}>{message.text}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      {footer ? <div className={styles.footer}>{footer}</div> : null}

      <div className={styles.composerWrap}>
        {showSuggestions ? (
          <div className={styles.suggestions} role="group" aria-label="Preguntas sugeridas">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                className={`${styles.suggestionChip} ${suggestion.active ? styles.suggestionChipActive : ""}`}
                disabled={busy || !onSuggestionClick}
                onClick={() => onSuggestionClick?.(suggestion)}
              >
                {suggestion.label}
              </button>
            ))}
            {suggestionExtras}
          </div>
        ) : null}
        {composer}
      </div>
    </div>
  );
}
