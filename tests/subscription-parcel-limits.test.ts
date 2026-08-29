import { describe, expect, it } from "vitest";
import {
  CreateOrgParcel,
  UpdateOrgParcel,
  resolveParcelQuota,
} from "@/application/parcel/mutate-org-parcels";
import {
  PLAN_PARCEL_COUNT_LIMITS,
  PLAN_PARCEL_MAX_HA,
  inferPlanSlugForQuota,
  parcelCountLimitForPlan,
  parcelMaxHaForPlan,
  parcelQuotaUsage,
} from "@/domain/billing/plan-limits";
import { approximateAreaHectares, demoParcelSquare, squareAround } from "@/domain/parcel/geometry";
import { MemoryOrgMetadataStore } from "@/infrastructure/auth/clerk-org-metadata-store";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";

const PLANS = ["free", "weather_plus", "operations", "full"] as const;

/** Rough half-side deg near Lima for target hectares (demo ~4.8 ha @ 0.000995). */
function squareForApproxHa(ha: number, lon = -77.04, lat = -11.94) {
  const delta = 0.000995 * Math.sqrt(ha / 4.8);
  return squareAround(lon, lat, delta);
}

describe("subscription parcel matrix (piloto medio)", () => {
  it.each(PLANS)("exposes count + maxHa for plan %s", (plan) => {
    expect(parcelCountLimitForPlan(plan)).toBe(PLAN_PARCEL_COUNT_LIMITS[plan]);
    expect(parcelMaxHaForPlan(plan)).toBe(PLAN_PARCEL_MAX_HA[plan]);
    expect(parcelCountLimitForPlan(plan)).toBeGreaterThan(0);
    expect(parcelMaxHaForPlan(plan)).toBeGreaterThan(0);
  });

  it("keeps free < plus < operations < full on both axes", () => {
    const counts = PLANS.map((p) => parcelCountLimitForPlan(p));
    const has = PLANS.map((p) => parcelMaxHaForPlan(p));
    expect(counts).toEqual([2, 10, 40, 100]);
    expect(has).toEqual([25, 100, 500, 2000]);
    for (let i = 1; i < counts.length; i += 1) {
      expect(counts[i]).toBeGreaterThan(counts[i - 1]);
      expect(has[i]).toBeGreaterThan(has[i - 1]);
    }
  });

  it("aliases free_org and weather_base to free quotas", () => {
    for (const alias of ["free_org", "weather_base"] as const) {
      expect(parcelCountLimitForPlan(alias)).toBe(2);
      expect(parcelMaxHaForPlan(alias)).toBe(25);
    }
  });

  it("inferPlanSlugForQuota prefers billing slug then entitlements", () => {
    expect(
      inferPlanSlugForQuota({
        billingPlanSlug: "weather_plus",
        entitlements: ["weather"],
      }),
    ).toBe("weather_plus");
    expect(
      inferPlanSlugForQuota({
        billingPlanSlug: null,
        entitlements: ["weather", "weather_plus", "traceability", "agronomic_review"],
      }),
    ).toBe("full");
    expect(
      inferPlanSlugForQuota({
        billingPlanSlug: "free",
        entitlements: ["weather", "weather_plus"],
      }),
    ).toBe("weather_plus");
  });
});

describe("CreateOrgParcel across subscriptions", () => {
  const auth = defaultSyntheticSnapshots.find((s) => s.userId === "user-agronomist-001")!;

  function stack(planSlug: string, entitlements: string[] = ["weather"]) {
    const registry = new SyntheticParcelRegistry([]);
    const metadata = new MemoryOrgMetadataStore({
      [auth.orgId]: {
        entitlements: entitlements as never[],
        authorizedParcelIds: [],
        billingPlanSlug: planSlug,
      },
    });
    return {
      registry,
      create: new CreateOrgParcel(registry, metadata),
      update: new UpdateOrgParcel(registry, metadata),
      metadata,
    };
  }

  it.each(PLANS)("fills count limit then blocks on %s", async (plan) => {
    const { create, registry, metadata } = stack(plan);
    const limit = parcelCountLimitForPlan(plan);
    for (let i = 0; i < limit; i += 1) {
      const result = await create.execute({
        authority: auth,
        orgId: auth.orgId,
        name: `P-${plan}-${i}`,
        geometry: demoParcelSquare(-77.04 - i * 0.01, -11.94),
      });
      expect(result.ok, `create ${i} on ${plan}`).toBe(true);
    }
    const blocked = await create.execute({
      authority: auth,
      orgId: auth.orgId,
      name: `P-${plan}-over`,
      geometry: demoParcelSquare(-77.5, -11.94),
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.reason).toBe("parcel_limit");
      expect(blocked.message).toMatch(/Facturación|plan/i);
    }
    const quota = await resolveParcelQuota({
      parcels: registry,
      metadata,
      authority: auth,
      orgId: auth.orgId,
    });
    expect(quota.used).toBe(limit);
    expect(quota.blocked).toBe(true);
    expect(quota.remaining).toBe(0);
    expect(quota.maxHaPerParcel).toBe(parcelMaxHaForPlan(plan));
  });

  it.each(PLANS)("accepts area under maxHa and rejects over on %s", async (plan) => {
    const { create } = stack(plan);
    const maxHa = parcelMaxHaForPlan(plan);
    const under = squareForApproxHa(Math.max(1, maxHa * 0.5));
    const underHa = approximateAreaHectares(under);
    expect(underHa).toBeLessThanOrEqual(maxHa);

    const ok = await create.execute({
      authority: auth,
      orgId: auth.orgId,
      name: `under-${plan}`,
      geometry: under,
    });
    expect(ok.ok).toBe(true);

    const over = squareForApproxHa(maxHa * 1.4);
    const overHa = approximateAreaHectares(over);
    expect(overHa).toBeGreaterThan(maxHa);

    const denied = await create.execute({
      authority: auth,
      orgId: auth.orgId,
      name: `over-${plan}`,
      geometry: over,
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.reason).toBe("parcel_area_limit");
      expect(denied.message).toContain(String(maxHa));
    }
  });

  it("delete frees a slot on free plan", async () => {
    const { create, registry, metadata } = stack("free");
    const a = await create.execute({
      authority: auth,
      orgId: auth.orgId,
      name: "A",
      geometry: demoParcelSquare(-77.04, -11.94),
    });
    const b = await create.execute({
      authority: auth,
      orgId: auth.orgId,
      name: "B",
      geometry: demoParcelSquare(-77.05, -11.95),
    });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok) return;

    await registry.delete(a.data.id);
    const quota = await resolveParcelQuota({
      parcels: registry,
      metadata,
      authority: auth,
      orgId: auth.orgId,
    });
    expect(quota.used).toBe(1);
    expect(quota.blocked).toBe(false);

    const c = await create.execute({
      authority: auth,
      orgId: auth.orgId,
      name: "C",
      geometry: demoParcelSquare(-77.06, -11.96),
    });
    expect(c.ok).toBe(true);
  });

  it("grandfather: shrink ok while still over max; expand denied", async () => {
    const { registry, update } = stack("weather_plus");
    const maxHa = parcelMaxHaForPlan("weather_plus");
    const huge = squareForApproxHa(maxHa * 3);
    expect(approximateAreaHectares(huge)).toBeGreaterThan(maxHa);

    const parcel = await registry.create({
      id: "parcel-gf-001",
      orgId: auth.orgId,
      name: "GF",
      latitude: -11.94,
      longitude: -77.04,
      timezone: "America/Lima",
      geometry: huge,
    });

    const mid = squareForApproxHa(maxHa * 2);
    const shrink = await update.execute({
      authority: auth,
      orgId: auth.orgId,
      parcelId: parcel.id,
      geometry: mid,
    });
    expect(shrink.ok).toBe(true);

    const bigger = squareForApproxHa(maxHa * 3.2);
    const expand = await update.execute({
      authority: auth,
      orgId: auth.orgId,
      parcelId: parcel.id,
      geometry: bigger,
    });
    expect(expand.ok).toBe(false);
    if (!expand.ok) {
      expect(expand.reason).toBe("parcel_area_limit");
    }

    const rename = await update.execute({
      authority: auth,
      orgId: auth.orgId,
      parcelId: parcel.id,
      name: "GF renamed",
    });
    expect(rename.ok).toBe(true);
  });

  it("quotaUsage mirrors resolveParcelQuota fields for UI top bar", () => {
    const usage = parcelQuotaUsage({ used: 3, planSlug: "weather_plus" });
    expect(usage).toMatchObject({
      limit: 10,
      used: 3,
      remaining: 7,
      blocked: false,
      maxHaPerParcel: 100,
    });
  });
});
