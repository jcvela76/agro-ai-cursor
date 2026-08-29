/**
 * QA-1 smoke — parcel CRUD (offline always; Neon optional).
 *
 * Usage:
 *   npm run smoke:parcels
 *   SMOKE_NEON=1 npm run smoke:parcels
 */
import { CreateOrgParcel, DeleteOrgParcel, UpdateOrgParcel } from "../src/application/parcel/mutate-org-parcels";
import { ListOrgParcels } from "../src/application/parcel/list-org-parcels";
import {
  approximateAreaHectares,
  demoParcelSquare,
} from "../src/domain/parcel/geometry";
import { defaultSyntheticSnapshots } from "../src/infrastructure/auth/synthetic-access-resolver";
import { createDb } from "../src/infrastructure/db/client";
import { NeonParcelRegistry } from "../src/infrastructure/parcel/neon-parcel-registry";
import { SyntheticParcelRegistry } from "../src/infrastructure/parcel/synthetic-parcel-registry";
import type { ParcelRegistry } from "../src/domain/parcel/types";

const orgId = "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G";
const authority = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-org-wide-weather-006",
)!;
const demoParcelId = "parcel-lima-norte-001";
const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(msg);
  }
}

async function runAgainst(label: string, registry: ParcelRegistry) {
  const list = new ListOrgParcels(registry);
  const create = new CreateOrgParcel(registry);
  const update = new UpdateOrgParcel(registry);
  const del = new DeleteOrgParcel(registry);
  const steps: string[] = [];

  const unauth = await list.execute({ authority: null, orgId: null });
  assert(!unauth.ok && unauth.reason === "unauthenticated", `${label}: list unauth`);
  steps.push("gate unauth");

  const listed = await list.execute({ authority, orgId });
  assert(listed.ok, `${label}: list failed`);
  assert(listed.data.some((p) => p.id === demoParcelId), `${label}: demo parcel missing`);
  steps.push(`list (${listed.data.length})`);

  const demo = listed.data.find((p) => p.id === demoParcelId);
  assert(demo?.geometry?.type === "Polygon", `${label}: demo geometry missing`);
  const demoHa = approximateAreaHectares(demo.geometry);
  if (label === "offline") {
    assert(Math.abs(demoHa - 4.8) < 0.6, `${label}: demo area ${demoHa.toFixed(1)} ha expected ~4.8`);
  } else {
    assert(demoHa > 0, `${label}: demo area must be > 0 (got ${demoHa})`);
    if (Math.abs(demoHa - 4.8) >= 0.6) {
      console.log(
        `WARN [${label}] demo parcel area ${demoHa.toFixed(1)} ha (fixture ~4.8); continuing CRUD`,
      );
    }
  }
  steps.push(`demo ${demoHa.toFixed(1)} ha`);

  const geometry = demoParcelSquare(-77.04, -11.94);
  const created = await create.execute({
    authority,
    orgId,
    name: `Smoke parcel ${stamp}`,
    geometry,
  });
  assert(created.ok, `${label}: create failed`);
  const parcelId = created.data.id;
  steps.push("create");

  const reloaded = await registry.getParcel(parcelId);
  assert(reloaded?.name === `Smoke parcel ${stamp}`, `${label}: create not persisted`);
  assert(reloaded.geometry?.type === "Polygon", `${label}: geometry missing after create`);
  steps.push("read after create");

  const renamed = await update.execute({
    authority,
    orgId,
    parcelId,
    name: `Smoke parcel ${stamp} (renamed)`,
  });
  assert(renamed.ok, `${label}: update name failed`);
  assert(renamed.data.name.includes("(renamed)"), `${label}: rename mismatch`);
  steps.push("patch name");

  const moved = await update.execute({
    authority,
    orgId,
    parcelId,
    geometry: demoParcelSquare(-77.04, -11.94),
  });
  assert(moved.ok, `${label}: update geometry failed`);
  steps.push("patch geometry");

  const crossOrg = defaultSyntheticSnapshots.find((s) => s.userId === "user-cross-ws-004")!;
  const denied = await update.execute({
    authority: crossOrg,
    orgId: crossOrg.orgId,
    parcelId,
    name: "Hack",
  });
  assert(!denied.ok && denied.reason === "not_found", `${label}: cross-org not blocked`);
  steps.push("cross-org blocked");

  const deleted = await del.execute({ authority, orgId, parcelId });
  assert(deleted.ok, `${label}: delete failed`);
  assert((await registry.getParcel(parcelId)) === undefined, `${label}: parcel still exists`);
  steps.push("delete");

  console.log(`PASS [${label}] ${steps.join(" → ")}`);
}

async function main() {
  console.log("QA-1 parcel smoke");
  await runAgainst("offline", new SyntheticParcelRegistry());

  if (process.env.SMOKE_NEON === "1") {
    assert(process.env.DATABASE_URL, "SMOKE_NEON=1 requires DATABASE_URL");
    await runAgainst("neon", new NeonParcelRegistry(createDb()));
  } else {
    console.log("SKIP [neon] set SMOKE_NEON=1 to include Neon persistence");
  }
}

main().catch((error) => {
  console.error("FAIL", error);
  process.exit(1);
});
