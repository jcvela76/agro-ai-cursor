import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";
import type {
  AgentChatMessage,
  AgentChatRegistry,
  AppendAgentChatMessageInput,
} from "@/domain/agent/chat-types";
import type { Db } from "@/infrastructure/db/client";
import { agentChatMessages } from "@/infrastructure/db/schema";

export class NeonAgentChatRegistry implements AgentChatRegistry {
  constructor(private readonly db: Db) {}

  async listMessages(input: {
    orgId: string;
    parcelId: string;
    since: Date;
    limit: number;
  }): Promise<AgentChatMessage[]> {
    const rows = await this.db
      .select()
      .from(agentChatMessages)
      .where(
        and(
          eq(agentChatMessages.orgId, input.orgId),
          eq(agentChatMessages.parcelId, input.parcelId),
          gte(agentChatMessages.createdAt, input.since),
        ),
      )
      .orderBy(desc(agentChatMessages.createdAt))
      .limit(input.limit);

    return rows.reverse().map((row) => this.toRecord(row));
  }

  async appendMessages(input: AppendAgentChatMessageInput[]): Promise<AgentChatMessage[]> {
    if (input.length === 0) {
      return [];
    }

    const baseMs = Date.now();
    const values = input.map((item, index) => ({
      id: item.id ?? `acm-${randomUUID()}`,
      orgId: item.orgId,
      parcelId: item.parcelId,
      role: item.role,
      parts: item.parts,
      authorUserId: item.authorUserId ?? null,
      createdAt: item.createdAt ?? new Date(baseMs + index),
    }));

    await this.db.insert(agentChatMessages).values(values).onConflictDoNothing();

    const ids = values.map((v) => v.id);
    const existing = await this.db
      .select()
      .from(agentChatMessages)
      .where(inArray(agentChatMessages.id, ids));

    const byId = new Map(existing.map((row) => [row.id, this.toRecord(row)]));
    return ids.map((id) => byId.get(id)).filter((row): row is AgentChatMessage => Boolean(row));
  }

  async pruneOlderThan(input: {
    orgId: string;
    parcelId: string;
    cutoff: Date;
  }): Promise<number> {
    const deleted = await this.db
      .delete(agentChatMessages)
      .where(
        and(
          eq(agentChatMessages.orgId, input.orgId),
          eq(agentChatMessages.parcelId, input.parcelId),
          lt(agentChatMessages.createdAt, input.cutoff),
        ),
      )
      .returning({ id: agentChatMessages.id });
    return deleted.length;
  }

  private toRecord(row: typeof agentChatMessages.$inferSelect): AgentChatMessage {
    return {
      id: row.id,
      orgId: row.orgId,
      parcelId: row.parcelId,
      role: row.role,
      parts: row.parts,
      authorUserId: row.authorUserId,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
