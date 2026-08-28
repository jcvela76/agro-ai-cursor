import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET as cronGet } from "@/app/api/cron/daily-briefings/route";
import {
  GET as prefsGet,
  PUT as prefsPut,
} from "@/app/api/reports/daily-briefing-delivery/route";

const mockRequireAdmin = vi.fn();
const mockGetPrefs = vi.fn();
const mockUpdatePrefs = vi.fn();
const mockRunDelivery = vi.fn();

vi.mock("@/lib/require-org-admin", () => ({
  requireOrgAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

vi.mock("@/infrastructure/container", () => ({
  getDailyBriefingDeliveryPrefs: { execute: (...args: unknown[]) => mockGetPrefs(...args) },
  updateDailyBriefingDeliveryPrefs: {
    execute: (...args: unknown[]) => mockUpdatePrefs(...args),
  },
  runDailyBriefingDelivery: { execute: (...args: unknown[]) => mockRunDelivery(...args) },
}));

describe("daily briefing delivery API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
  });

  it("GET prefs requires admin", async () => {
    mockRequireAdmin.mockResolvedValue({ ok: false, status: 403, message: "admin required" });
    const res = await prefsGet();
    expect(res.status).toBe(403);
  });

  it("PUT prefs saves when valid", async () => {
    mockRequireAdmin.mockResolvedValue({ ok: true, orgId: "org_1", userId: "u1" });
    mockUpdatePrefs.mockResolvedValue({
      ok: true,
      prefs: {
        orgId: "org_1",
        enabled: true,
        channels: ["email"],
        sendAtLocal: "06:00",
        parcelIds: [],
        emailRecipients: ["a@b.com"],
        updatedAt: "2026-08-28T00:00:00.000Z",
      },
    });
    const res = await prefsPut(
      new Request("http://localhost/api/reports/daily-briefing-delivery", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: true,
          channels: ["email"],
          emailRecipients: ["a@b.com"],
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.enabled).toBe(true);
  });

  it("cron rejects missing secret", async () => {
    const res = await cronGet(new Request("http://localhost/api/cron/daily-briefings"));
    expect(res.status).toBe(401);
  });

  it("cron runs with bearer secret", async () => {
    mockRunDelivery.mockResolvedValue({
      reportDay: "2026-08-28",
      orgsProcessed: 0,
      results: [],
    });
    const res = await cronGet(
      new Request("http://localhost/api/cron/daily-briefings", {
        headers: { Authorization: "Bearer test-cron-secret" },
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("OK");
    expect(json.data.reportDay).toBe("2026-08-28");
  });
});
