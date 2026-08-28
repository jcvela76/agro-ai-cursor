import { describe, expect, it } from "vitest";
import {
  GetParcelRecentBriefings,
  reportDayWindowStart,
} from "@/application/report/get-parcel-recent-briefings";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineReportRegistry } from "@/infrastructure/report/offline-report-registry";

describe("reportDayWindowStart", () => {
  it("includes today when days=1", () => {
    expect(reportDayWindowStart("2026-08-28", 1)).toBe("2026-08-28");
  });

  it("spans days-1 calendar days back", () => {
    expect(reportDayWindowStart("2026-08-28", 3)).toBe("2026-08-26");
  });
});

describe("GetParcelRecentBriefings", () => {
  const parcels = new SyntheticParcelRegistry();
  const reports = new OfflineReportRegistry();
  const useCase = new GetParcelRecentBriefings(parcels, reports);
  const plus = defaultSyntheticSnapshots.find((s) => s.userId === "user-plus-005")!;
  const weatherOnly = defaultSyntheticSnapshots.find(
    (s) => s.userId === "user-agronomist-001",
  )!;

  it("denies without Plus", async () => {
    const result = await useCase.execute({
      authority: weatherOnly,
      parcelId: "parcel-lima-norte-001",
    });
    expect(result.ok).toBe(false);
  });

  it("returns empty list when no briefings", async () => {
    const result = await useCase.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      days: 3,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.briefings).toEqual([]);
  });

  it("lists ready briefings without html/pdf and clamps days", async () => {
    await reports.saveReport({
      orgId: plus.orgId,
      createdByUserId: plus.userId,
      reportType: "daily_briefing",
      title: "Briefing diario · Lima Norte",
      parcelId: "parcel-lima-norte-001",
      reportDay: "2026-08-28",
      billingMonth: "2026-08",
      contextSnapshot: {
        reportDay: "2026-08-28",
        parcelId: "parcel-lima-norte-001",
        parcelName: "Lima Norte",
        signals: [],
        suggestions: [],
        openQuestions: [],
        limits: ["ET0 ≠ riego"],
      },
      htmlContent: "<html>secret</html>",
      pdfBase64: "cGRm",
    });

    const listed = await reports.listReadyDailyBriefings(
      plus.orgId,
      "parcel-lima-norte-001",
      "2026-08-01",
    );
    expect(listed).toHaveLength(1);
    expect(listed[0]?.reportDay).toBe("2026-08-28");

    const result = await useCase.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      days: 99,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.days).toBe(14);
    expect(result.data.briefings).toHaveLength(1);
    expect(result.data.briefings[0]?.reportDay).toBe("2026-08-28");
    expect(result.data.briefings[0]?.contextSnapshot?.limits).toContain("ET0 ≠ riego");
    expect(JSON.stringify(result.data)).not.toContain("secret");
    expect(JSON.stringify(result.data)).not.toContain("cGRm");
  });
});
