/**
 * QA-3 smoke — spectral indices + overlay (offline always).
 *
 * Usage:
 *   npm run smoke:spectral
 *   SMOKE_SENTINEL_STUB=1 npm run smoke:spectral   # also exercises sentinel_hub_stub source
 */
import { GetParcelSpectralOverlay } from "../src/application/spectral/get-parcel-spectral-overlay";
import { GetParcelVegetationIndices } from "../src/application/spectral/get-parcel-vegetation-indices";
import { defaultSyntheticSnapshots } from "../src/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "../src/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineSpectralSource } from "../src/infrastructure/spectral/offline-spectral-source";
import {
  SENTINEL_HUB_STUB_SOURCE_ID,
  SentinelHubStubSpectralSource,
} from "../src/infrastructure/spectral/sentinel-hub-stub-spectral-source";

const parcelId = "parcel-lima-norte-001";
const weatherOnly = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-agronomist-001",
)!;
const weatherPlus = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-plus-005",
)!;
const crossOrg = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-cross-ws-004",
)!;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(msg);
  }
}

async function runOfflineSmoke() {
  const parcels = new SyntheticParcelRegistry();
  const source = new OfflineSpectralSource();
  const indices = new GetParcelVegetationIndices(parcels, source);
  const overlay = new GetParcelSpectralOverlay(parcels, source);
  const steps: string[] = [];

  const unauth = await indices.execute({ authority: null, parcelId });
  assert(!unauth.ok && unauth.reason === "unavailable", "offline: unauth indices");
  steps.push("gate unauth");

  const noPlus = await indices.execute({ authority: weatherOnly, parcelId });
  assert(!noPlus.ok && noPlus.message.includes("Plus"), "offline: weather-only denied");
  steps.push("gate weather-only");

  const cross = await indices.execute({ authority: crossOrg, parcelId });
  assert(!cross.ok && cross.reason === "unavailable", "offline: cross-org indices");
  steps.push("gate cross-org");

  const idx = await indices.execute({ authority: weatherPlus, parcelId });
  assert(idx.ok, "offline: indices failed");
  assert(idx.data.indices.length === 8, "offline: expected 8 indices");
  assert(idx.data.indices[0]?.id === "ndre", "offline: ndre first");
  assert(Math.abs((idx.data.indices[0]?.value ?? 0) - 0.2857) < 0.001, "offline: ndre value");
  assert(
    idx.data.evidence.sourceId === "offline-sentinel-2-synthetic",
    "offline: source id",
  );
  steps.push(`indices 8 (ndre ${idx.data.indices[0]?.value?.toFixed(4)})`);

  const ov = await overlay.execute({
    authority: weatherPlus,
    parcelId,
    indexId: "ndre",
  });
  assert(ov.ok, "offline: overlay failed");
  assert(ov.data.kind === "spectral_overlay", "offline: overlay kind");
  assert(ov.data.grid.features.length > 0, "offline: overlay grid empty");
  assert(ov.data.legend.minLabel === "Estrés", "offline: legend");
  steps.push(`overlay ${ov.data.grid.features.length} cells`);

  console.log(`PASS [offline] ${steps.join(" → ")}`);
}

async function runSentinelStubSmoke() {
  const parcels = new SyntheticParcelRegistry();
  const source = new SentinelHubStubSpectralSource();
  const indices = new GetParcelVegetationIndices(parcels, source);
  const steps: string[] = [];

  const denied = await indices.execute({ authority: weatherOnly, parcelId });
  assert(!denied.ok && denied.message.includes("Plus"), "sentinel_stub: weather-only denied");
  steps.push("gate weather-only");

  const allowed = await indices.execute({ authority: weatherPlus, parcelId });
  assert(allowed.ok, "sentinel_stub: indices failed");
  assert(
    allowed.data.evidence.sourceId === SENTINEL_HUB_STUB_SOURCE_ID,
    "sentinel_stub: source id",
  );
  assert(allowed.data.indices.length === 8, "sentinel_stub: index count");
  steps.push("indices sentinel_hub_stub");

  console.log(`PASS [sentinel_hub_stub] ${steps.join(" → ")}`);
}

async function main() {
  console.log("QA-3 spectral smoke");
  await runOfflineSmoke();

  if (process.env.SMOKE_SENTINEL_STUB === "1") {
    await runSentinelStubSmoke();
  } else {
    console.log("SKIP [sentinel_hub_stub] set SMOKE_SENTINEL_STUB=1 to include stub source");
  }
}

main().catch((error) => {
  console.error("FAIL", error);
  process.exit(1);
});
