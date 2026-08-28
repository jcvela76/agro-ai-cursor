/**
 * QA-6 smoke — agronomic review list + append (offline always; Neon optional).
 *
 * Usage:
 *   npm run smoke:review
 *   SMOKE_NEON=1 npm run smoke:review   # also hits Neon via DATABASE_URL
 */
import { AppendOrgReviewDecision } from "../src/application/review/append-org-review-decision";
import { ListOrgReviewDecisions } from "../src/application/review/list-org-review-decisions";
import type { ReviewDecisionRegistry } from "../src/domain/review/types";
import { defaultSyntheticSnapshots } from "../src/infrastructure/auth/synthetic-access-resolver";
import { createDb } from "../src/infrastructure/db/client";
import { SyntheticParcelRegistry } from "../src/infrastructure/parcel/synthetic-parcel-registry";
import { NeonReviewDecisionRegistry } from "../src/infrastructure/review/neon-review-registry";
import { OfflineReviewDecisionRegistry } from "../src/infrastructure/review/offline-review-registry";

const orgId = "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G";
const entitled = defaultSyntheticSnapshots[7];
const denied = defaultSyntheticSnapshots[0];
const parcelId = "parcel-lima-norte-001";
const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(msg);
  }
}

async function runAgainst(label: string, registry: ReviewDecisionRegistry) {
  const list = new ListOrgReviewDecisions(registry);
  const append = new AppendOrgReviewDecision(
    registry,
    new SyntheticParcelRegistry(),
  );
  const steps: string[] = [];

  const unauth = await list.execute({ authority: null, orgId: null });
  assert(!unauth.ok && unauth.reason === "unauthenticated", `${label}: list unauth`);
  steps.push("gate unauth");

  const deniedList = await list.execute({ authority: denied, orgId });
  assert(
    !deniedList.ok && deniedList.reason === "missing_agronomic_review_entitlement",
    `${label}: expected gate deny`,
  );
  steps.push("gate deny");

  const before = await list.execute({
    authority: entitled,
    orgId,
    parcelId,
  });
  assert(before.ok, `${label}: list failed`);
  const beforeCount = before.data.length;
  steps.push(`list (${beforeCount})`);

  const summary = `Smoke Review ${stamp}`;
  const created = await append.execute({
    authority: entitled,
    orgId,
    parcelId,
    kind: "decide",
    summary,
    rationale: "Smoke Review-2: append must survive Neon persistence.",
    actorId: entitled.userId,
    evidenceRef: `synthetic://smoke-review-${stamp}`,
  });
  assert(created.ok, `${label}: append failed`);
  assert(created.data.kind === "decide", `${label}: kind mismatch`);
  assert(created.data.parcelId === parcelId, `${label}: parcel mismatch`);
  steps.push("append decide");

  const after = await list.execute({
    authority: entitled,
    orgId,
    parcelId,
  });
  assert(after.ok, `${label}: re-list failed`);
  assert(
    after.data.some((d) => d.id === created.data.id && d.summary === summary),
    `${label}: appended decision missing from list`,
  );
  assert(after.data.length === beforeCount + 1, `${label}: count not +1`);
  steps.push("list includes append");

  const badParcel = await append.execute({
    authority: entitled,
    orgId,
    parcelId: "parcel-does-not-exist",
    kind: "observe",
    summary: "bad",
    rationale: "bad",
    actorId: entitled.userId,
  });
  assert(
    !badParcel.ok && badParcel.reason === "cross_org_parcel",
    `${label}: expected cross_org_parcel`,
  );
  steps.push("cross-org blocked");

  console.log(`PASS [${label}] ${steps.join(" → ")}`);
  console.log(`  decision=${created.data.id}`);
}

async function main() {
  console.log("QA-6 review smoke");
  await runAgainst("offline", new OfflineReviewDecisionRegistry());

  if (process.env.SMOKE_NEON === "1") {
    assert(process.env.DATABASE_URL, "SMOKE_NEON=1 requires DATABASE_URL");
    await runAgainst("neon", new NeonReviewDecisionRegistry(createDb()));
  } else {
    console.log("SKIP [neon] set SMOKE_NEON=1 to include Neon persistence");
  }
}

main().catch((error) => {
  console.error("FAIL", error);
  process.exit(1);
});
