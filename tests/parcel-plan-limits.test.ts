import { describe, expect, it } from "vitest";
import {
  CreateOrgParcel,
  DeleteOrgParcel,
  UpdateOrgParcel,
} from "@/application/parcel/mutate-org-parcels";
import {
  parcelCountLimitForPlan,
  parcelMaxHaForPlan,
  parcelQuotaUsage,
} from "@/domain/billing/plan-limits";
import { demoParcelSquare, squareAround } from "@/domain/parcel/geometry";
import { MemoryOrgMetadataStore } from "@/infrastructure/auth/clerk-org-metadata-store";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";

describe("parcel plan limits helpers", () => {
  it("maps pilot-mid count and max ha", () => {
    expect(parcelCountLimitForPlan("free")).toBe(2);
    expect(parcelMaxHaForPlan("free")).toBe(25);
    expect(parcelCountLimitForPlan("weather_plus")).toBe(10);
    expect(parcelMaxHaForPlan("weather_plus")).toBe(100);
    expect(parcelCountLimitForPlan("operations")).toBe(40);
    expect(parcelMaxHaForPlan("operations")).toBe(500);
    expect(parcelCountLimitForPlan("full")).toBe(100);
    expect(parcelMaxHaForPlan("full")).toBe(2000);
  });

  it("reports blocked when used >= limit", () => {
    expect(parcelQuotaUsage({ used: 2, planSlug: "free" }).blocked).toBe(true);
    expect(parcelQuotaUsage({ used: 1, planSlug: "free" }).remaining).toBe(1);
  });
});

describe("CreateOrgParcel / UpdateOrgParcel plan limits", () => {
  const freeAuth = defaultSyntheticSnapshots.find((s) => s.userId === "user-agronomist-001")!;

  function stack(planSlug: string) {
    const registry = new SyntheticParcelRegistry([]);
    const metadata = new MemoryOrgMetadataStore({
      [freeAuth.orgId]: {
        entitlements: ["weather"],
        authorizedParcelIds: [],
        billingPlanSlug: planSlug,
      },
    });
    return {
      registry,
      create: new CreateOrgParcel(registry, metadata),
      update: new UpdateOrgParcel(registry, metadata),
      del: new DeleteOrgParcel(registry),
    };
  }

  it("blocks create when parcel count limit is reached", async () => {
    const { create } = stack("free");
    const geo = demoParcelSquare(-77.04, -11.94);

    const first = await create.execute({
      authority: freeAuth,
      orgId: freeAuth.orgId,
      name: "A",
      geometry: geo,
    });
    expect(first.ok).toBe(true);

    const second = await create.execute({
      authority: freeAuth,
      orgId: freeAuth.orgId,
      name: "B",
      geometry: demoParcelSquare(-77.05, -11.95),
    });
    expect(second.ok).toBe(true);

    const third = await create.execute({
      authority: freeAuth,
      orgId: freeAuth.orgId,
      name: "C",
      geometry: demoParcelSquare(-77.06, -11.96),
    });
    expect(third.ok).toBe(false);
    if (!third.ok) {
      expect(third.reason).toBe("parcel_limit");
    }
  });

  it("blocks create when area exceeds max ha", async () => {
    const { create } = stack("free");
    const huge = squareAround(-77.04, -11.94, 0.01); // ~hundreds of ha
    const result = await create.execute({
      authority: freeAuth,
      orgId: freeAuth.orgId,
      name: "Huge",
      geometry: huge,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("parcel_area_limit");
    }
  });

  it("allows shrink of grandfathered oversized parcel but blocks expand", async () => {
    const { registry, update } = stack("weather_plus");
    const oversized = squareAround(-77.04, -11.94, 0.01);
    const created = await registry.create({
      id: "parcel-oversize-001",
      orgId: freeAuth.orgId,
      name: "Oversize",
      latitude: -11.94,
      longitude: -77.04,
      timezone: "America/Lima",
      geometry: oversized,
    });

    const stillBig = squareAround(-77.04, -11.94, 0.009);
    const shrink = await update.execute({
      authority: freeAuth,
      orgId: freeAuth.orgId,
      parcelId: created.id,
      geometry: stillBig,
    });
    expect(shrink.ok).toBe(true);

    const expand = await update.execute({
      authority: freeAuth,
      orgId: freeAuth.orgId,
      parcelId: created.id,
      geometry: squareAround(-77.04, -11.94, 0.012),
    });
    expect(expand.ok).toBe(false);
    if (!expand.ok) {
      expect(expand.reason).toBe("parcel_area_limit");
    }
  });
});
