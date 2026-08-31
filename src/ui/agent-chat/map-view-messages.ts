import { agentToolNoteForParts } from "@/content/agent/tool-notes";
import type { AgentChatViewMessage } from "@/ui/agent-chat/agent-chat-view";

export function mapAgentChatToViewMessages(
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    parts: Array<{ type: string; text?: string; toolName?: string }>;
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
      const toolNote = hasToolActivity ? agentToolNoteForParts(message.parts) : null;

      return {
        id: message.id,
        role: "assistant" as const,
        text,
        toolNote,
        showToolNoteWithText: isStreamingAssistant && hasToolActivity && !text,
        streaming: isStreamingAssistant,
      };
    });
}
