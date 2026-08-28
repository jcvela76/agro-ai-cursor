import { describe, expect, it } from "vitest";
import {
  normalizeDeliveryChannels,
  normalizeEmailRecipients,
  normalizeSendAtLocal,
  validateDeliveryPrefsInput,
} from "@/domain/report/daily-briefing-delivery";
import { OfflineDailyBriefingDeliveryPrefsRegistry } from "@/infrastructure/report/offline-daily-briefing-delivery-prefs";
import { StubEmailSender } from "@/infrastructure/email/email-sender";
import { OfflineReportRegistry } from "@/infrastructure/report/offline-report-registry";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { MemoryOrgMetadataStore } from "@/infrastructure/auth/clerk-org-metadata-store";
import { UpdateDailyBriefingDeliveryPrefs } from "@/application/report/daily-briefing-delivery-prefs";
import { RunDailyBriefingDelivery } from "@/application/report/run-daily-briefing-delivery";
import type { GenerateOrgReport } from "@/application/report/report-use-cases";

describe("daily briefing delivery prefs", () => {
  it("normalizes emails and channels", () => {
    expect(normalizeEmailRecipients(["  A@B.com ", "a@b.com", "bad"])).toEqual(["a@b.com"]);
    expect(normalizeDeliveryChannels(["email", "whatsapp", "sms"])).toEqual([
      "email",
      "whatsapp",
    ]);
    expect(normalizeSendAtLocal("06:30")).toBe("06:30");
    expect(normalizeSendAtLocal("99:99")).toBe("06:00");
  });

  it("requires recipients when enabling email", () => {
    expect(
      validateDeliveryPrefsInput({
        enabled: true,
        channels: ["email"],
        emailRecipients: [],
      }).ok,
    ).toBe(false);
    expect(
      validateDeliveryPrefsInput({
        enabled: true,
        channels: ["email"],
        emailRecipients: ["a@b.com"],
      }).ok,
    ).toBe(true);
  });

  it("rejects whatsapp until implemented", () => {
    const result = validateDeliveryPrefsInput({
      enabled: true,
      channels: ["email", "whatsapp"],
      emailRecipients: ["a@b.com"],
    });
    expect(result.ok).toBe(false);
  });

  it("upserts prefs offline", async () => {
    const registry = new OfflineDailyBriefingDeliveryPrefsRegistry();
    const update = new UpdateDailyBriefingDeliveryPrefs(registry);
    const result = await update.execute({
      orgId: "org_demo",
      enabled: true,
      channels: ["email"],
      emailRecipients: ["agronomo@example.com"],
      parcelIds: [],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.prefs.enabled).toBe(true);
    const listed = await registry.listEnabled();
    expect(listed).toHaveLength(1);
  });
});

describe("run daily briefing delivery", () => {
  it("generates missing briefing and emails recipients", async () => {
    const prefs = new OfflineDailyBriefingDeliveryPrefsRegistry();
    await prefs.upsert({
      orgId: "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G",
      enabled: true,
      channels: ["email"],
      emailRecipients: ["ops@example.com"],
      parcelIds: ["parcel-lima-norte-001"],
    });

    const parcels = new SyntheticParcelRegistry();
    const reports = new OfflineReportRegistry();
    const metadata = new MemoryOrgMetadataStore({
      org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G: {
        entitlements: ["weather", "weather_plus"],
        authorizedParcelIds: [],
        billingPlanSlug: "weather_plus",
      },
    });
    const email = new StubEmailSender();

    const generateReport = {
      execute: async () => ({
        ok: true as const,
        report: {
          id: "rpt-cron-1",
          orgId: "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G",
          createdByUserId: "system:daily-briefing-cron",
          reportType: "daily_briefing" as const,
          status: "ready" as const,
          title: "Briefing diario · Lima Norte",
          parcelId: "parcel-lima-norte-001",
          lotId: null,
          reportDay: "2026-08-28",
          billingMonth: "2026-08",
          parentReportId: null,
          contextSnapshot: null,
          htmlContent: "<html></html>",
          pdfBase64: "dGVzdA==",
          createdAt: new Date().toISOString(),
        },
        quota: {
          point: { limit: 10, used: 0, remaining: 10 },
          daily: { limit: 20, used: 1, remaining: 19 },
          billingMonth: "2026-08",
          planSlug: "weather_plus",
          plusEnabled: true,
        },
      }),
    } as unknown as GenerateOrgReport;

    const runner = new RunDailyBriefingDelivery(
      prefs,
      parcels,
      reports,
      metadata,
      generateReport,
      email,
    );

    const result = await runner.execute({ now: new Date("2026-08-28T12:00:00Z") });
    expect(result.orgsProcessed).toBe(1);
    expect(result.results[0]?.parcels[0]?.emailed).toBe(true);
    expect(result.results[0]?.parcels[0]?.generated).toBe(true);
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]?.to).toEqual(["ops@example.com"]);
    expect(email.sent[0]?.subject).toContain("Briefing diario");
  });

  it("skips orgs without Plus", async () => {
    const prefs = new OfflineDailyBriefingDeliveryPrefsRegistry();
    await prefs.upsert({
      orgId: "org_free",
      enabled: true,
      channels: ["email"],
      emailRecipients: ["ops@example.com"],
    });
    const runner = new RunDailyBriefingDelivery(
      prefs,
      new SyntheticParcelRegistry(),
      new OfflineReportRegistry(),
      new MemoryOrgMetadataStore({
        org_free: {
          entitlements: ["weather"],
          authorizedParcelIds: [],
        },
      }),
      { execute: async () => ({ ok: false as const, reason: "missing_plus_entitlement" as const, message: "no" }) } as unknown as GenerateOrgReport,
      new StubEmailSender(),
    );
    const result = await runner.execute();
    expect(result.results[0]?.parcels[0]?.skippedReason).toBe("missing_plus_entitlement");
  });
});
