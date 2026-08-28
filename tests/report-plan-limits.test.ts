import { describe, expect, it } from "vitest";
import {
  currentBillingMonthKey,
  inferPlanSlugForQuota,
  reportLimitForPlan,
  reportQuotaUsage,
} from "@/domain/billing/plan-limits";

describe("report plan limits", () => {
  it("maps report quotas by plan", () => {
    expect(reportLimitForPlan("free")).toBe(0);
    expect(reportLimitForPlan("weather_plus")).toBe(10);
    expect(reportLimitForPlan("operations")).toBe(30);
    expect(reportLimitForPlan("full")).toBe(50);
  });

  it("blocks when quota reached", () => {
    const quota = reportQuotaUsage({ used: 10, planSlug: "weather_plus" });
    expect(quota.blocked).toBe(true);
    expect(quota.remaining).toBe(0);
  });

  it("infers plan from entitlements when billing slug missing", () => {
    expect(
      inferPlanSlugForQuota({
        entitlements: ["weather", "weather_plus"],
      }),
    ).toBe("weather_plus");
  });

  it("formats billing month in Lima timezone", () => {
    const key = currentBillingMonthKey(new Date("2026-08-28T12:00:00Z"));
    expect(key).toMatch(/^\d{4}-\d{2}$/);
  });
});
