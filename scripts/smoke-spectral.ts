/**
 * QA-3 smoke — spectral indices + overlay (offline always).
 *
 * Usage:
 *   npm run smoke:spectral
 *   SMOKE_SENTINEL_STUB=1 npm run smoke:spectral   # also exercises sentinel_hub_stub source
 *   SMOKE_SENTINEL_LIVE=1 npm run smoke:spectral   # CDSE live (needs SENTINEL_CLIENT_* in env)
 */
import { GetParcelSpectralOverlay } from "../src/application/spectral/get-parcel-spectral-overlay";
import { GetParcelSpectralZones } from "../src/application/spectral/get-parcel-spectral-zones";
import { GetParcelVegetationIndices } from "../src/application/spectral/get-parcel-vegetation-indices";
import { defaultSyntheticSnapshots } from "../src/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "../src/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineSpectralSource } from "../src/infrastructure/spectral/offline-spectral-source";
import {
  SENTINEL_HUB_STUB_SOURCE_ID,
  SentinelHubStubSpectralSource,
} from "../src/infrastructure/spectral/sentinel-hub-stub-spectral-source";
import {
  SENTINEL_HUB_SOURCE_ID,
  SentinelHubSpectralSource,
} from "../src/infrastructure/spectral/sentinel-hub-spectral-source";

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
  assert(ov.data.rendering === "synthetic_grid", "offline: synthetic rendering");
  steps.push(`overlay ${ov.data.grid.features.length} cells`);

  const zonesUc = new GetParcelSpectralZones(parcels, source);
  const zones = await zonesUc.execute({
    authority: weatherPlus,
    parcelId,
    indexId: "ndre",
  });
  assert(zones.ok, "offline: zones failed");
  assert(zones.data.kind === "spectral_zones", "offline: zones kind");
  assert(zones.data.zones.length >= 1, "offline: zones empty");
  steps.push(`zones ${zones.data.zones.length}`);

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

async function runSentinelLiveSmoke() {
  const clientId = process.env.SENTINEL_CLIENT_ID;
  const clientSecret = process.env.SENTINEL_CLIENT_SECRET;
  assert(clientId && clientSecret, "live: SENTINEL_CLIENT_ID/SECRET required");

  const parcels = new SyntheticParcelRegistry();
  const source = new SentinelHubSpectralSource({ clientId, clientSecret });
  const indices = new GetParcelVegetationIndices(parcels, source);
  const steps: string[] = [];

  const denied = await indices.execute({ authority: weatherOnly, parcelId });
  assert(!denied.ok && denied.message.includes("Plus"), "live: weather-only denied");
  steps.push("gate weather-only");

  const allowed = await indices.execute({ authority: weatherPlus, parcelId });
  assert(allowed.ok, `live: indices failed (${!allowed.ok ? allowed.message : ""})`);
  assert(allowed.data.evidence.sourceId === SENTINEL_HUB_SOURCE_ID, "live: source id");
  assert(allowed.data.indices.length === 8, "live: index count");
  steps.push(
    `indices live (${allowed.data.acquisitionDate} ${allowed.data.evidence.freshnessStatus})`,
  );

  const overlay = new GetParcelSpectralOverlay(parcels, source);
  const ov = await overlay.execute({
    authority: weatherPlus,
    parcelId,
    indexId: "ndwi",
  });
  assert(ov.ok, `live: overlay failed (${!ov.ok ? ov.message : ""})`);
  assert(ov.data.rendering === "sentinel_raster", "live: expected sentinel_raster overlay");
  assert(Boolean(ov.data.raster?.imageDataUrl), "live: missing raster data URL");
  steps.push(`overlay raster ${ov.data.raster?.width}x${ov.data.raster?.height}`);

  const zonesUc = new GetParcelSpectralZones(parcels, source);
  const zones = await zonesUc.execute({
    authority: weatherPlus,
    parcelId,
    indexId: "ndwi",
  });
  assert(zones.ok, `live: zones failed (${!zones.ok ? zones.message : ""})`);
  assert(zones.data.zones.length >= 1, "live: zones empty");
  steps.push(`zones ${zones.data.zones.length} (${zones.data.methodId})`);

  console.log(`PASS [sentinel_hub] ${steps.join(" → ")}`);
}

async function main() {
  console.log("QA-3 spectral smoke");
  await runOfflineSmoke();

  if (process.env.SMOKE_SENTINEL_STUB === "1") {
    await runSentinelStubSmoke();
  } else {
    console.log("SKIP [sentinel_hub_stub] set SMOKE_SENTINEL_STUB=1 to include stub source");
  }

  if (process.env.SMOKE_SENTINEL_LIVE === "1") {
    await runSentinelLiveSmoke();
  } else {
    console.log("SKIP [sentinel_hub] set SMOKE_SENTINEL_LIVE=1 for CDSE live smoke");
  }
}

main().catch((error) => {
  console.error("FAIL", error);
  process.exit(1);
});
