import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSyntheticSnapshots } from "./helpers/agent-route-mocks";

const authFn = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authFn,
}));

vi.mock("@/infrastructure/container", async () => {
  const { agentRouteContainerMock } = await import("./helpers/agent-route-mocks");
  return agentRouteContainerMock;
});

import { GET, POST } from "@/app/api/agent/chat/route";

const weatherOnly = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-agronomist-001",
)!;
const weatherPlus = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-plus-005",
)!;

const gatewayKeys = ["AI_GATEWAY_API_KEY", "VERCEL_OIDC_TOKEN", "VERCEL"] as const;
const savedGateway: Partial<Record<(typeof gatewayKeys)[number], string | undefined>> = {};

function mockAuth(userId: string | null, orgId: string | null) {
  authFn.mockResolvedValue({ userId, orgId });
}

function clearGatewayEnv() {
  for (const key of gatewayKeys) {
    savedGateway[key] = process.env[key];
    delete process.env[key];
  }
}

function restoreGatewayEnv() {
  for (const key of gatewayKeys) {
    if (savedGateway[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedGateway[key];
    }
  }
}

function enableGatewayEnv() {
  process.env.AI_GATEWAY_API_KEY = "test-smoke-key";
}

describe("API /api/agent/chat", () => {
  beforeEach(() => {
    authFn.mockReset();
    clearGatewayEnv();
  });

  afterEach(() => {
    restoreGatewayEnv();
  });

  it("GET returns plusEnabled false when unauthenticated", async () => {
    mockAuth(null, null);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(body.data.plusEnabled).toBe(false);
  });

  it("GET returns plusEnabled true for Plus user", async () => {
    mockAuth(weatherPlus.userId, weatherPlus.orgId);
    const res = await GET();
    const body = await res.json();
    expect(body.data.plusEnabled).toBe(true);
  });

  it("GET returns plusEnabled false for weather-only user", async () => {
    mockAuth(weatherOnly.userId, weatherOnly.orgId);
    const res = await GET();
    const body = await res.json();
    expect(body.data.plusEnabled).toBe(false);
  });

  it("POST returns 403 without weather_plus", async () => {
    mockAuth(weatherOnly.userId, weatherOnly.orgId);
    enableGatewayEnv();
    const res = await POST(
      new Request("http://localhost/api/agent/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          parcelId: "parcel-lima-norte-001",
          message: "Hola",
        }),
      }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.status).toBe("AGENT_UNAVAILABLE");
    expect(body.message).toContain("Plus");
  });

  it("POST returns 503 when AI Gateway is not configured", async () => {
    mockAuth(weatherPlus.userId, weatherPlus.orgId);
    const res = await POST(
      new Request("http://localhost/api/agent/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          parcelId: "parcel-lima-norte-001",
          message: "Hola",
        }),
      }),
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("AGENT_UNAVAILABLE");
    expect(body.message).toContain("Gateway");
  });

  it("POST returns 400 when parcelId is missing", async () => {
    mockAuth(weatherPlus.userId, weatherPlus.orgId);
    enableGatewayEnv();
    const res = await POST(
      new Request("http://localhost/api/agent/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Hola" }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("parcelId");
  });

  it("POST returns 400 when message and messages are empty", async () => {
    mockAuth(weatherPlus.userId, weatherPlus.orgId);
    enableGatewayEnv();
    const res = await POST(
      new Request("http://localhost/api/agent/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ parcelId: "parcel-lima-norte-001", messages: [] }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("messages or message");
  });
});
