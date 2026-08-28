/**
 * QA-5 smoke — traceability list, CRUD, events + EUDR (offline always; Neon optional).
 *
 * Usage:
 *   npm run smoke:trace
 *   SMOKE_NEON=1 npm run smoke:trace   # also hits Neon via DATABASE_URL
 */
import { ListOrgTraceLots } from "../src/application/traceability/list-org-trace-lots";
import {
  AppendOrgTraceEvent,
  CreateOrgTraceLot,
  UpdateOrgTraceLotEudr,
} from "../src/application/traceability/mutate-org-trace-lots";
import { evaluateEudrExportReadiness } from "../src/domain/traceability/types";
import type { TraceLotRegistry } from "../src/domain/traceability/types";
import { defaultSyntheticSnapshots } from "../src/infrastructure/auth/synthetic-access-resolver";
import { createDb } from "../src/infrastructure/db/client";
import { SyntheticParcelRegistry } from "../src/infrastructure/parcel/synthetic-parcel-registry";
import { NeonTraceLotRegistry } from "../src/infrastructure/traceability/neon-trace-lot-registry";
import { OfflineTraceLotRegistry } from "../src/infrastructure/traceability/offline-trace-lot-registry";

const orgId = "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G";
const entitled = defaultSyntheticSnapshots.find((s) => s.userId === "user-trace-007")!;
const weatherOnly = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-agronomist-001",
)!;
const parcelId = "parcel-lima-norte-001";
const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(msg);
  }
}

async function runAgainst(label: string, registry: TraceLotRegistry) {
  const parcels = new SyntheticParcelRegistry();
  const list = new ListOrgTraceLots(registry);
  const create = new CreateOrgTraceLot(registry, parcels);
  const update = new UpdateOrgTraceLotEudr(registry);
  const append = new AppendOrgTraceEvent(registry);
  const steps: string[] = [];

  const unauth = await list.execute({ authority: null, orgId: null });
  assert(!unauth.ok && unauth.reason === "unauthenticated", `${label}: list unauth`);
  steps.push("gate unauth");

  const noEnt = await list.execute({ authority: weatherOnly, orgId });
  assert(
    !noEnt.ok && noEnt.reason === "missing_traceability_entitlement",
    `${label}: list no entitlement`,
  );
  steps.push("gate no entitlement");

  const listed = await list.execute({ authority: entitled, orgId });
  assert(listed.ok, `${label}: list failed`);
  assert(listed.data.length >= 2, `${label}: expected fixtures`);
  steps.push(`list (${listed.data.length})`);

  const created = await create.execute({
    authority: entitled,
    orgId,
    name: `Smoke trace ${stamp}`,
    harvestSeason: "2026",
    producerName: "Smoke Producer",
    parcelId,
  });
  assert(created.ok, `${label}: create failed`);
  const lotId = created.data.lot.id;
  steps.push("create");

  const patched = await update.execute({
    authority: entitled,
    orgId,
    lotId,
    countryOfProduction: "PE",
    productionEndDate: "2026-08-01",
    deforestationFreeDeclared: true,
  });
  assert(patched.ok, `${label}: patch eudr failed`);
  assert(evaluateEudrExportReadiness(patched.data).ok, `${label}: eudr not ready after patch`);
  steps.push("patch eudr");

  const harvested = await append.execute({
    authority: entitled,
    orgId,
    lotId,
    eventType: "harvested",
    occurredAt: "2026-08-20T10:00:00-05:00",
  });
  assert(harvested.ok, `${label}: harvested failed`);
  steps.push("event harvested");

  const incomplete = await create.execute({
    authority: entitled,
    orgId,
    name: `Smoke EUDR incomplete ${stamp}`,
    harvestSeason: "2026",
    producerName: "Smoke Producer",
    deforestationFreeDeclared: false,
    parcelId,
  });
  assert(incomplete.ok, `${label}: create incomplete failed`);
  const blocked = await append.execute({
    authority: entitled,
    orgId,
    lotId: incomplete.data.lot.id,
    eventType: "exported",
    occurredAt: "2026-08-27T12:00:00-05:00",
  });
  assert(!blocked.ok && blocked.reason === "eudr_incomplete", `${label}: eudr_incomplete`);
  steps.push("export blocked");

  const exported = await append.execute({
    authority: entitled,
    orgId,
    lotId,
    eventType: "exported",
    occurredAt: "2026-08-27T15:00:00-05:00",
    evidenceRef: "synthetic://smoke-trace-bol",
  });
  assert(exported.ok, `${label}: export failed`);
  assert(exported.data.lot.status === "exported", `${label}: status not exported`);
  steps.push("export ok");

  console.log(`PASS [${label}] ${steps.join(" → ")}`);
  console.log(`  lot=${lotId}`);
}

async function main() {
  console.log("QA-5 trace smoke");
  await runAgainst("offline", new OfflineTraceLotRegistry());

  if (process.env.SMOKE_NEON === "1") {
    assert(process.env.DATABASE_URL, "SMOKE_NEON=1 requires DATABASE_URL");
    await runAgainst("neon", new NeonTraceLotRegistry(createDb()));
  } else {
    console.log("SKIP [neon] set SMOKE_NEON=1 to include Neon persistence");
  }
}

main().catch((error) => {
  console.error("FAIL", error);
  process.exit(1);
});
