import { describe, expect, it } from "vitest";
import { EnsureFreeOrgOnCreate } from "@/application/billing/ensure-free-org-on-create";
import { SyncOrgBillingEntitlements } from "@/application/billing/sync-org-billing-entitlements";
import { MemoryOrgMetadataStore } from "@/infrastructure/auth/clerk-org-metadata-store";

describe("EnsureFreeOrgOnCreate", () => {
  it("applies free_org + weather when metadata is empty", async () => {
    const store = new MemoryOrgMetadataStore();
    const useCase = new EnsureFreeOrgOnCreate(store, new SyncOrgBillingEntitlements(store));

    const result = await useCase.execute("org_new");
    expect(result).toBe("applied");

    const meta = await store.getPublicMetadata("org_new");
    expect(meta.billingPlanSlug).toBe("free_org");
    expect(meta.entitlements).toEqual(["weather"]);
  });

  it("skips when already free with weather", async () => {
    const store = new MemoryOrgMetadataStore({
      org_free: {
        entitlements: ["weather"],
        authorizedParcelIds: [],
        billingPlanSlug: "free_org",
      },
    });
    const useCase = new EnsureFreeOrgOnCreate(store, new SyncOrgBillingEntitlements(store));

    expect(await useCase.execute("org_free")).toBe("skipped");
  });

  it("skips paid plan slugs", async () => {
    const store = new MemoryOrgMetadataStore({
      org_plus: {
        entitlements: ["weather", "weather_plus"],
        authorizedParcelIds: [],
        billingPlanSlug: "weather_plus",
      },
    });
    const useCase = new EnsureFreeOrgOnCreate(store, new SyncOrgBillingEntitlements(store));

    expect(await useCase.execute("org_plus")).toBe("skipped");
    const meta = await store.getPublicMetadata("org_plus");
    expect(meta.billingPlanSlug).toBe("weather_plus");
  });
});
