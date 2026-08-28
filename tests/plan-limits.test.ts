import { describe, expect, it } from "vitest";
import { memberLimitForPlan, memberSeatUsage } from "@/domain/billing/plan-limits";

describe("plan-limits", () => {
  it("defaults free tier to 2 seats", () => {
    expect(memberLimitForPlan(null)).toBe(2);
    expect(memberLimitForPlan("free_org")).toBe(2);
  });

  it("maps paid tiers", () => {
    expect(memberLimitForPlan("weather_plus")).toBe(5);
    expect(memberLimitForPlan("org:weather_plus")).toBe(5);
    expect(memberLimitForPlan("operations")).toBe(15);
    expect(memberLimitForPlan("full")).toBe(25);
  });

  it("blocks invite when at cap including pending", () => {
    const atCap = memberSeatUsage({
      activeMembers: 4,
      pendingInvites: 1,
      planSlug: "weather_plus",
    });
    expect(atCap.blocked).toBe(true);
    expect(atCap.remaining).toBe(0);

    const under = memberSeatUsage({
      activeMembers: 3,
      pendingInvites: 1,
      planSlug: "weather_plus",
    });
    expect(under.blocked).toBe(false);
    expect(under.remaining).toBe(1);
  });
});
