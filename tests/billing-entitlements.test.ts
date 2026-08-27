import { describe, expect, it } from "vitest";
import {
  entitlementsFromPlanSlug,
  resolveBillingEntitlements,
} from "@/domain/billing/plan-entitlements";
import { parseSubscriptionItemEvent } from "@/application/billing/parse-subscription-item-event";
import { SyncOrgBillingEntitlements } from "@/application/billing/sync-org-billing-entitlements";
import { MemoryOrgMetadataStore } from "@/infrastructure/auth/clerk-org-metadata-store";

describe("plan entitlements mapper", () => {
  it("maps known plan slugs", () => {
    expect(entitlementsFromPlanSlug("weather_plus")).toEqual(["weather", "weather_plus"]);
    expect(entitlementsFromPlanSlug("org:weather_plus")).toEqual(["weather", "weather_plus"]);
    expect(entitlementsFromPlanSlug("operations")).toContain("traceability");
    expect(entitlementsFromPlanSlug("unknown")).toEqual(["weather"]);
  });

  it("prefers feature keys over plan slug", () => {
    expect(
      resolveBillingEntitlements({
        featureKeys: ["weather", "traceability"],
        planSlug: "weather_plus",
      }),
    ).toEqual(["weather", "traceability"]);
  });
});

describe("parseSubscriptionItemEvent", () => {
  const baseData = {
    payer: { organization_id: "org_test_billing_001" },
    plan: {
      slug: "weather_plus",
      features: [{ slug: "weather" }, { slug: "weather_plus" }],
    },
  };

  it("grants on subscriptionItem.active", () => {
    const parsed = parseSubscriptionItemEvent("subscriptionItem.active", baseData);
    expect(parsed).toMatchObject({
      orgId: "org_test_billing_001",
      planSlug: "weather_plus",
      action: "grant",
      entitlements: ["weather", "weather_plus"],
    });
  });

  it("normalizes org: plan slug prefix", () => {
    const parsed = parseSubscriptionItemEvent("subscriptionItem.active", {
      payer: { organization_id: "org_test_billing_001" },
      plan: { slug: "org:operations", features: [] },
    });
    expect(parsed?.planSlug).toBe("operations");
    expect(parsed?.entitlements).toEqual([
      "weather",
      "weather_plus",
      "traceability",
      "agronomic_review",
    ]);
  });

  it("revokes to free on subscriptionItem.ended", () => {
    const parsed = parseSubscriptionItemEvent("subscriptionItem.ended", baseData);
    expect(parsed).toMatchObject({
      orgId: "org_test_billing_001",
      planSlug: "free",
      action: "revoke_to_free",
      entitlements: ["weather"],
    });
  });

  it("returns null without org payer", () => {
    expect(parseSubscriptionItemEvent("subscriptionItem.active", { plan: { slug: "full" } })).toBeNull();
  });
});

describe("SyncOrgBillingEntitlements", () => {
  it("updates entitlements and preserves parcel allowlist", async () => {
    const store = new MemoryOrgMetadataStore({
      org_x: {
        entitlements: ["weather"],
        authorizedParcelIds: ["parcel-a"],
        billingPlanSlug: "free",
      },
    });
    const sync = new SyncOrgBillingEntitlements(store);
    const next = await sync.execute({
      orgId: "org_x",
      entitlements: ["weather", "weather_plus"],
      planSlug: "weather_plus",
    });
    expect(next.authorizedParcelIds).toEqual(["parcel-a"]);
    expect(next.entitlements).toEqual(["weather", "weather_plus"]);
    expect(next.billingPlanSlug).toBe("weather_plus");
  });
});
