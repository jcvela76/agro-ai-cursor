import { describe, expect, it } from "vitest";
import {
  AGENT_CHAT_LOAD_MAX_MESSAGES,
  agentChatRetentionDaysForPlan,
} from "@/domain/billing/plan-limits";
import {
  agentChatRetentionCutoff,
  sanitizeAgentChatParts,
} from "@/domain/agent/chat-types";
import { OfflineAgentChatRegistry } from "@/infrastructure/agent/offline-agent-chat-registry";
import {
  AppendParcelAgentChat,
  LoadParcelAgentChat,
} from "@/application/agent/parcel-agent-chat";
import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import type { Parcel, ParcelRegistry } from "@/domain/parcel/types";
import type { OrgMetadataStore, WorkspaceSettings } from "@/domain/workspace/types";

describe("agent chat retention limits", () => {
  it("maps retention days by plan", () => {
    expect(agentChatRetentionDaysForPlan("free")).toBe(0);
    expect(agentChatRetentionDaysForPlan("weather_plus")).toBe(7);
    expect(agentChatRetentionDaysForPlan("operations")).toBe(30);
    expect(agentChatRetentionDaysForPlan("full")).toBe(90);
    expect(agentChatRetentionDaysForPlan("org:operations")).toBe(30);
  });

  it("caps load window at 80 messages", () => {
    expect(AGENT_CHAT_LOAD_MAX_MESSAGES).toBe(80);
  });

  it("sanitizes only text parts", () => {
    expect(
      sanitizeAgentChatParts([
        { type: "text", text: "hola" },
        { type: "tool-invocation", toolName: "x" },
        { type: "text", text: "mundo" },
      ]),
    ).toEqual([
      { type: "text", text: "hola" },
      { type: "text", text: "mundo" },
    ]);
  });
});

describe("offline agent chat registry prune", () => {
  it("prunes messages older than cutoff", async () => {
    const registry = new OfflineAgentChatRegistry();
    const now = new Date("2026-08-29T12:00:00.000Z");
    await registry.appendMessages([
      {
        id: "old",
        orgId: "org_1",
        parcelId: "p1",
        role: "user",
        parts: [{ type: "text", text: "old" }],
        createdAt: new Date("2026-08-01T12:00:00.000Z"),
      },
      {
        id: "new",
        orgId: "org_1",
        parcelId: "p1",
        role: "user",
        parts: [{ type: "text", text: "new" }],
        createdAt: now,
      },
    ]);

    const cutoff = agentChatRetentionCutoff(7, now);
    const removed = await registry.pruneOlderThan({
      orgId: "org_1",
      parcelId: "p1",
      cutoff,
    });
    expect(removed).toBe(1);

    const remaining = await registry.listMessages({
      orgId: "org_1",
      parcelId: "p1",
      since: cutoff,
      limit: 80,
    });
    expect(remaining.map((m) => m.id)).toEqual(["new"]);
  });
});

function memoryParcels(parcel: Parcel): ParcelRegistry {
  return {
    async listByOrgId(orgId: string) {
      return parcel.orgId === orgId ? [parcel] : [];
    },
    async getParcel(id: string) {
      return id === parcel.id ? parcel : undefined;
    },
    async create() {
      throw new Error("not implemented");
    },
    async update() {
      throw new Error("not implemented");
    },
    async delete() {
      throw new Error("not implemented");
    },
  };
}

function memoryMetadata(settings: WorkspaceSettings): OrgMetadataStore {
  return {
    async getPublicMetadata() {
      return settings;
    },
    async setWorkspaceSettings(_orgId, next) {
      return next;
    },
  };
}

describe("Load/Append parcel agent chat", () => {
  const parcel: Parcel = {
    id: "parcel_1",
    orgId: "org_1",
    name: "Demo",
    latitude: -14,
    longitude: -75,
    timezone: "America/Lima",
    geometry: null,
  };

  const plusAuthority: AccessSnapshot = {
    userId: "user_1",
    orgId: "org_1",
    isActiveMember: true,
    entitlements: ["weather", "weather_plus"],
    authorizedParcelIds: [],
  };

  it("loads empty history for Plus with retention badge days", async () => {
    const chats = new OfflineAgentChatRegistry();
    const load = new LoadParcelAgentChat(
      memoryParcels(parcel),
      chats,
      memoryMetadata({
        entitlements: ["weather", "weather_plus"],
        authorizedParcelIds: [],
        billingPlanSlug: "weather_plus",
      }),
    );

    const result = await load.execute({ authority: plusAuthority, parcelId: parcel.id });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plusEnabled).toBe(true);
    expect(result.retentionDays).toBe(7);
    expect(result.messages).toEqual([]);
  });

  it("appends and reloads within retention", async () => {
    const chats = new OfflineAgentChatRegistry();
    const metadata = memoryMetadata({
      entitlements: ["weather", "weather_plus"],
      authorizedParcelIds: [],
      billingPlanSlug: "operations",
    });
    const parcels = memoryParcels(parcel);
    const append = new AppendParcelAgentChat(parcels, chats, metadata);
    const load = new LoadParcelAgentChat(parcels, chats, metadata);

    const saved = await append.execute({
      authority: plusAuthority,
      parcelId: parcel.id,
      authorUserId: "user_1",
      turns: [
        {
          id: "u1",
          role: "user",
          parts: [{ type: "text", text: "¿Temp?" }],
        },
        {
          id: "a1",
          role: "assistant",
          parts: [{ type: "text", text: "18 °C (Open-Meteo)" }],
        },
      ],
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.retentionDays).toBe(30);
    expect(saved.messages).toHaveLength(2);

    const loaded = await load.execute({ authority: plusAuthority, parcelId: parcel.id });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.messages.map((m) => m.id)).toEqual(["u1", "a1"]);
  });

  it("denies without Plus", async () => {
    const chats = new OfflineAgentChatRegistry();
    const load = new LoadParcelAgentChat(
      memoryParcels(parcel),
      chats,
      memoryMetadata({
        entitlements: ["weather"],
        authorizedParcelIds: [],
        billingPlanSlug: "free",
      }),
    );
    const result = await load.execute({
      authority: { ...plusAuthority, entitlements: ["weather"] },
      parcelId: parcel.id,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plusEnabled).toBe(false);
    expect(result.messages).toEqual([]);
  });
});
