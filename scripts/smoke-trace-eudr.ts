/**
 * Trace-4 EUDR smoke — application-level (offline always; Neon optional).
 *
 * Usage:
 *   npm run smoke:trace-eudr
 *   SMOKE_NEON=1 npm run smoke:trace-eudr   # also hits Neon via DATABASE_URL
 */
import {
  AppendOrgTraceEvent,
  CreateOrgTraceLot,
} from "../src/application/traceability/mutate-org-trace-lots";
import { evaluateEudrExportReadiness } from "../src/domain/traceability/types";
import type { TraceLotRegistry } from "../src/domain/traceability/types";
import { defaultSyntheticSnapshots } from "../src/infrastructure/auth/synthetic-access-resolver";
import { createDb } from "../src/infrastructure/db/client";
import { SyntheticParcelRegistry } from "../src/infrastructure/parcel/synthetic-parcel-registry";
import { NeonTraceLotRegistry } from "../src/infrastructure/traceability/neon-trace-lot-registry";
import { OfflineTraceLotRegistry } from "../src/infrastructure/traceability/offline-trace-lot-registry";

const orgId = "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G";
const entitled = defaultSyntheticSnapshots[6];
const parcelId = "parcel-lima-norte-001";
const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(msg);
  }
}

async function runAgainst(label: string, registry: TraceLotRegistry) {
  const create = new CreateOrgTraceLot(registry, new SyntheticParcelRegistry());
  const append = new AppendOrgTraceEvent(registry);
  const steps: string[] = [];

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
  steps.push("create incomplete");

  const blocked = await append.execute({
    authority: entitled,
    orgId,
    lotId: incomplete.data.lot.id,
    eventType: "exported",
    occurredAt: "2026-08-27T12:00:00-05:00",
  });
  assert(!blocked.ok && blocked.reason === "eudr_incomplete", `${label}: expected eudr_incomplete`);
  steps.push("export blocked");

  const complete = await create.execute({
    authority: entitled,
    orgId,
    name: `Smoke EUDR ready ${stamp}`,
    harvestSeason: "2026",
    producerName: "Cooperativa Smoke EUDR",
    countryOfProduction: "PE",
    productionEndDate: "2026-08-01",
    deforestationFreeDeclared: true,
    parcelId,
  });
  assert(complete.ok, `${label}: create complete failed`);
  assert(evaluateEudrExportReadiness(complete.data).ok, `${label}: readiness false`);
  steps.push("create complete");

  const exported = await append.execute({
    authority: entitled,
    orgId,
    lotId: complete.data.lot.id,
    eventType: "exported",
    occurredAt: "2026-08-27T15:00:00-05:00",
    evidenceRef: "synthetic://smoke-eudr-bol",
  });
  assert(exported.ok, `${label}: export failed`);
  assert(exported.data.lot.status === "exported", `${label}: status not exported`);
  steps.push("export ok");

  console.log(`PASS [${label}] ${steps.join(" → ")}`);
  console.log(`  incomplete=${incomplete.data.lot.id}`);
  console.log(`  ready=${complete.data.lot.id}`);
}

async function main() {
  console.log("Trace-4 EUDR smoke");
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
