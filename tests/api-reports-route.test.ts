import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST as generatePost } from "@/app/api/reports/generate/route";
import { GET as quotaGet } from "@/app/api/reports/quota/route";

const mockResolve = vi.fn();
const mockGetQuota = vi.fn();
const mockGenerate = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: "user-plus-005", orgId: "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G" })),
}));

vi.mock("@/infrastructure/container", () => ({
  createAccessResolver: () => ({ resolve: mockResolve }),
  getReportQuota: { execute: (...args: unknown[]) => mockGetQuota(...args) },
  generateOrgReport: { execute: (...args: unknown[]) => mockGenerate(...args) },
}));

describe("reports API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolve.mockResolvedValue({
      userId: "user-plus-005",
      orgId: "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G",
      isActiveMember: true,
      entitlements: ["weather", "weather_plus"],
      authorizedParcelIds: [],
    });
  });

  it("GET quota returns usage", async () => {
    mockGetQuota.mockResolvedValue({
      limit: 10,
      used: 2,
      remaining: 8,
      billingMonth: "2026-08",
      planSlug: "weather_plus",
      plusEnabled: true,
    });
    const res = await quotaGet();
    const json = await res.json();
    expect(json.status).toBe("OK");
    expect(json.data.remaining).toBe(8);
  });

  it("POST generate returns preview and pdf urls", async () => {
    mockGenerate.mockResolvedValue({
      ok: true,
      report: {
        id: "rpt-test-1",
        title: "Clima · Demo",
        reportType: "weather_climate",
      },
      quota: { limit: 10, used: 3, remaining: 7 },
    });

    const req = new Request("http://localhost/api/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportType: "weather_climate",
        parcelId: "parcel-lima-norte-001",
      }),
    });
    const res = await generatePost(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.previewUrl).toBe("/reports/rpt-test-1");
    expect(json.data.pdfUrl).toBe("/api/reports/rpt-test-1/pdf");
  });

  it("POST generate returns 403 without plus", async () => {
    mockGenerate.mockResolvedValue({
      ok: false,
      reason: "missing_plus_entitlement",
      message: "Plus required",
    });
    const req = new Request("http://localhost/api/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportType: "weather_climate", parcelId: "p1" }),
    });
    const res = await generatePost(req);
    expect(res.status).toBe(403);
  });
});
