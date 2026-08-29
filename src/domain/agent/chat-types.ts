export type AgentChatRole = "user" | "assistant" | "system";

export type AgentChatMessagePart = {
  type: "text";
  text: string;
};

export interface AgentChatMessage {
  id: string;
  orgId: string;
  parcelId: string;
  role: AgentChatRole;
  parts: AgentChatMessagePart[];
  authorUserId: string | null;
  createdAt: string;
}

export interface AppendAgentChatMessageInput {
  id?: string;
  orgId: string;
  parcelId: string;
  role: AgentChatRole;
  parts: AgentChatMessagePart[];
  authorUserId?: string | null;
  createdAt?: Date;
}

export interface AgentChatRegistry {
  listMessages(input: {
    orgId: string;
    parcelId: string;
    since: Date;
    limit: number;
  }): Promise<AgentChatMessage[]>;

  appendMessages(input: AppendAgentChatMessageInput[]): Promise<AgentChatMessage[]>;

  pruneOlderThan(input: {
    orgId: string;
    parcelId: string;
    cutoff: Date;
  }): Promise<number>;
}

/** Persist only serializable text parts from UIMessage-like parts. */
export function sanitizeAgentChatParts(parts: unknown): AgentChatMessagePart[] {
  if (!Array.isArray(parts)) {
    return [];
  }
  const out: AgentChatMessagePart[] = [];
  for (const part of parts) {
    if (
      part &&
      typeof part === "object" &&
      "type" in part &&
      (part as { type: unknown }).type === "text" &&
      "text" in part &&
      typeof (part as { text: unknown }).text === "string"
    ) {
      out.push({ type: "text", text: (part as { text: string }).text });
    }
  }
  return out;
}

export function agentChatRetentionCutoff(retentionDays: number, now = new Date()): Date {
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
}
