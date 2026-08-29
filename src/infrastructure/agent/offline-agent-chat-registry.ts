import { randomUUID } from "node:crypto";
import type {
  AgentChatMessage,
  AgentChatRegistry,
  AppendAgentChatMessageInput,
} from "@/domain/agent/chat-types";

export class OfflineAgentChatRegistry implements AgentChatRegistry {
  private readonly messages = new Map<string, AgentChatMessage>();

  async listMessages(input: {
    orgId: string;
    parcelId: string;
    since: Date;
    limit: number;
  }): Promise<AgentChatMessage[]> {
    const sinceMs = input.since.getTime();
    const matched = [...this.messages.values()]
      .filter(
        (m) =>
          m.orgId === input.orgId &&
          m.parcelId === input.parcelId &&
          new Date(m.createdAt).getTime() >= sinceMs,
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, input.limit)
      .reverse();
    return matched;
  }

  async appendMessages(input: AppendAgentChatMessageInput[]): Promise<AgentChatMessage[]> {
    const saved: AgentChatMessage[] = [];
    const baseMs = Date.now();
    for (let i = 0; i < input.length; i += 1) {
      const item = input[i]!;
      const id = item.id ?? `acm-${randomUUID()}`;
      if (this.messages.has(id)) {
        const existing = this.messages.get(id)!;
        saved.push(existing);
        continue;
      }
      const record: AgentChatMessage = {
        id,
        orgId: item.orgId,
        parcelId: item.parcelId,
        role: item.role,
        parts: item.parts,
        authorUserId: item.authorUserId ?? null,
        createdAt: (item.createdAt ?? new Date(baseMs + i)).toISOString(),
      };
      this.messages.set(id, record);
      saved.push(record);
    }
    return saved;
  }

  async pruneOlderThan(input: {
    orgId: string;
    parcelId: string;
    cutoff: Date;
  }): Promise<number> {
    const cutoffMs = input.cutoff.getTime();
    let removed = 0;
    for (const [id, message] of this.messages) {
      if (
        message.orgId === input.orgId &&
        message.parcelId === input.parcelId &&
        new Date(message.createdAt).getTime() < cutoffMs
      ) {
        this.messages.delete(id);
        removed += 1;
      }
    }
    return removed;
  }

  /** Test helper */
  clear(): void {
    this.messages.clear();
  }
}
