import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import {
  authorizeWeatherAccess,
  authorizeWeatherPlusAccess,
} from "@/domain/auth/authorize-weather-access";
import {
  AGENT_CHAT_LOAD_MAX_MESSAGES,
  agentChatRetentionDaysForPlan,
  inferPlanSlugForQuota,
} from "@/domain/billing/plan-limits";
import {
  agentChatRetentionCutoff,
  sanitizeAgentChatParts,
  type AgentChatMessage,
  type AgentChatRegistry,
  type AppendAgentChatMessageInput,
} from "@/domain/agent/chat-types";
import type { ParcelRegistry } from "@/domain/parcel/types";
import type { OrgMetadataStore } from "@/domain/workspace/types";

export type LoadParcelAgentChatResult =
  | {
      ok: true;
      plusEnabled: true;
      retentionDays: number;
      messages: AgentChatMessage[];
    }
  | {
      ok: true;
      plusEnabled: false;
      retentionDays: 0;
      messages: [];
    }
  | { ok: false; reason: "unavailable"; message: string };

export type AppendParcelAgentChatResult =
  | { ok: true; messages: AgentChatMessage[]; retentionDays: number }
  | { ok: false; reason: "unavailable"; message: string };

async function authorizeParcelAgentChat(
  parcels: ParcelRegistry,
  authority: AccessSnapshot | null | undefined,
  parcelId: string,
): Promise<
  | { ok: true; authority: AccessSnapshot; orgId: string }
  | { ok: false; reason: "unavailable"; message: string }
> {
  if (!authorizeWeatherPlusAccess(authority) || !authority) {
    return {
      ok: false,
      reason: "unavailable",
      message: "Weather Intelligence Plus is required for Agro Agent chat.",
    };
  }

  const parcel = await parcels.getParcel(parcelId);
  if (!parcel) {
    return {
      ok: false,
      reason: "unavailable",
      message: "Agent chat is not available for this request.",
    };
  }

  const access = authorizeWeatherAccess(authority, parcelId, parcel.orgId);
  if (!access.ok) {
    return {
      ok: false,
      reason: "unavailable",
      message: "Agent chat is not available for this request.",
    };
  }

  return { ok: true, authority, orgId: parcel.orgId };
}

export class AuthorizeParcelAgentChat {
  constructor(private readonly parcels: ParcelRegistry) {}

  async execute(input: {
    authority: AccessSnapshot | null;
    parcelId: string;
  }): Promise<
    | { ok: true; authority: AccessSnapshot; orgId: string }
    | { ok: false; reason: "unavailable"; message: string }
  > {
    return authorizeParcelAgentChat(this.parcels, input.authority, input.parcelId);
  }
}

async function resolveRetentionDays(
  metadataStore: OrgMetadataStore,
  authority: AccessSnapshot,
): Promise<number> {
  const settings = await metadataStore.getPublicMetadata(authority.orgId);
  const planSlug = inferPlanSlugForQuota({
    billingPlanSlug: settings.billingPlanSlug,
    entitlements: settings.entitlements.length > 0 ? settings.entitlements : authority.entitlements,
  });
  return agentChatRetentionDaysForPlan(planSlug);
}

export class LoadParcelAgentChat {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly chats: AgentChatRegistry,
    private readonly metadataStore: OrgMetadataStore,
  ) {}

  async execute(input: {
    authority: AccessSnapshot | null;
    parcelId: string;
  }): Promise<LoadParcelAgentChatResult> {
    if (!authorizeWeatherPlusAccess(input.authority) || !input.authority) {
      return { ok: true, plusEnabled: false, retentionDays: 0, messages: [] };
    }

    const gate = await authorizeParcelAgentChat(
      this.parcels,
      input.authority,
      input.parcelId,
    );
    if (!gate.ok) {
      return gate;
    }

    const retentionDays = await resolveRetentionDays(this.metadataStore, gate.authority);
    if (retentionDays <= 0) {
      return { ok: true, plusEnabled: true, retentionDays: 0, messages: [] };
    }

    const cutoff = agentChatRetentionCutoff(retentionDays);
    await this.chats.pruneOlderThan({
      orgId: gate.orgId,
      parcelId: input.parcelId,
      cutoff,
    });

    const messages = await this.chats.listMessages({
      orgId: gate.orgId,
      parcelId: input.parcelId,
      since: cutoff,
      limit: AGENT_CHAT_LOAD_MAX_MESSAGES,
    });

    return {
      ok: true,
      plusEnabled: true,
      retentionDays,
      messages,
    };
  }
}

export class AppendParcelAgentChat {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly chats: AgentChatRegistry,
    private readonly metadataStore: OrgMetadataStore,
  ) {}

  async execute(input: {
    authority: AccessSnapshot | null;
    parcelId: string;
    authorUserId: string | null;
    turns: Array<{
      id?: string;
      role: AppendAgentChatMessageInput["role"];
      parts: unknown;
      authorUserId?: string | null;
    }>;
  }): Promise<AppendParcelAgentChatResult> {
    const gate = await authorizeParcelAgentChat(
      this.parcels,
      input.authority,
      input.parcelId,
    );
    if (!gate.ok) {
      return gate;
    }

    const retentionDays = await resolveRetentionDays(this.metadataStore, gate.authority);
    if (retentionDays <= 0) {
      return { ok: true, messages: [], retentionDays: 0 };
    }

    const toAppend: AppendAgentChatMessageInput[] = [];
    for (const turn of input.turns) {
      const parts = sanitizeAgentChatParts(turn.parts);
      if (parts.length === 0) {
        continue;
      }
      toAppend.push({
        id: turn.id,
        orgId: gate.orgId,
        parcelId: input.parcelId,
        role: turn.role,
        parts,
        authorUserId:
          turn.role === "user"
            ? (turn.authorUserId ?? input.authorUserId)
            : (turn.authorUserId ?? null),
      });
    }

    const messages =
      toAppend.length > 0 ? await this.chats.appendMessages(toAppend) : [];

    const cutoff = agentChatRetentionCutoff(retentionDays);
    await this.chats.pruneOlderThan({
      orgId: gate.orgId,
      parcelId: input.parcelId,
      cutoff,
    });

    return { ok: true, messages, retentionDays };
  }
}
