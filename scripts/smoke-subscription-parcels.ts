/**
 * Smoke — subscription parcel quotas (# + max ha) across plans.
 *
 *   npm run smoke:subscription-parcels
 */
import {
  CreateOrgParcel,
  resolveParcelQuota,
} from "../src/application/parcel/mutate-org-parcels";
import {
  PLAN_PARCEL_COUNT_LIMITS,
  PLAN_PARCEL_MAX_HA,
  parcelCountLimitForPlan,
  parcelMaxHaForPlan,
} from "../src/domain/billing/plan-limits";
import { approximateAreaHectares, demoParcelSquare, squareAround } from "../src/domain/parcel/geometry";
import { MemoryOrgMetadataStore } from "../src/infrastructure/auth/clerk-org-metadata-store";
import { defaultSyntheticSnapshots } from "../src/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "../src/infrastructure/parcel/synthetic-parcel-registry";

const PLANS = ["free", "weather_plus", "operations", "full"] as const;
const auth = defaultSyntheticSnapshots.find((s) => s.userId === "user-agronomist-001")!;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(msg);
  }
}

function squareForApproxHa(ha: number) {
  const delta = 0.000995 * Math.sqrt(ha / 4.8);
  return squareAround(-77.04, -11.94, delta);
}

async function runPlan(plan: (typeof PLANS)[number]): Promise<string> {
  const registry = new SyntheticParcelRegistry([]);
  const metadata = new MemoryOrgMetadataStore({
    [auth.orgId]: {
      entitlements: ["weather"],
      authorizedParcelIds: [],
      billingPlanSlug: plan,
    },
  });
  const create = new CreateOrgParcel(registry, metadata);
  const countLimit = parcelCountLimitForPlan(plan);
  const maxHa = parcelMaxHaForPlan(plan);
  assert(countLimit === PLAN_PARCEL_COUNT_LIMITS[plan], `${plan}: count map`);
  assert(maxHa === PLAN_PARCEL_MAX_HA[plan], `${plan}: ha map`);

  for (let i = 0; i < countLimit; i += 1) {
    const ok = await create.execute({
      authority: auth,
      orgId: auth.orgId,
      name: `${plan}-${i}`,
      geometry: demoParcelSquare(-77.04 - i * 0.008, -11.94),
    });
    assert(ok.ok, `${plan}: create ${i} should pass`);
  }

  const overCount = await create.execute({
    authority: auth,
    orgId: auth.orgId,
    name: `${plan}-over-count`,
    geometry: demoParcelSquare(-76.5, -11.94),
  });
  assert(!overCount.ok && overCount.reason === "parcel_limit", `${plan}: count limit`);

  const registryHa = new SyntheticParcelRegistry([]);
  const createHa = new CreateOrgParcel(registryHa, metadata);
  const under = squareForApproxHa(Math.max(1, maxHa * 0.4));
  assert(approximateAreaHectares(under) <= maxHa, `${plan}: under fixture`);
  const underOk = await createHa.execute({
    authority: auth,
    orgId: auth.orgId,
    name: `${plan}-under-ha`,
    geometry: under,
  });
  assert(underOk.ok, `${plan}: under ha create`);

  const over = squareForApproxHa(maxHa * 1.5);
  assert(approximateAreaHectares(over) > maxHa, `${plan}: over fixture`);
  const overHa = await createHa.execute({
    authority: auth,
    orgId: auth.orgId,
    name: `${plan}-over-ha`,
    geometry: over,
  });
  assert(!overHa.ok && overHa.reason === "parcel_area_limit", `${plan}: ha limit`);

  const quota = await resolveParcelQuota({
    parcels: registry,
    metadata,
    authority: auth,
    orgId: auth.orgId,
  });
  assert(quota.used === countLimit && quota.blocked, `${plan}: quota blocked at cap`);
  assert(quota.maxHaPerParcel === maxHa, `${plan}: quota maxHa`);

  return `${plan}: ${countLimit} parcels · ≤${maxHa} ha`;
}

async function main() {
  console.log("Subscription parcel quotas smoke");
  const lines: string[] = [];
  for (const plan of PLANS) {
    lines.push(await runPlan(plan));
  }
  console.log(`PASS [offline] ${lines.join(" → ")}`);
}

main().catch((error) => {
  console.error("FAIL", error);
  process.exit(1);
});
