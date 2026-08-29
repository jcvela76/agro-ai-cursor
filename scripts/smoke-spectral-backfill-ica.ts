/**
 * Spectral-9 smoke — backfill histórico en parcela nueva (Ica, zona agrícola real).
 *
 * Crea una parcela ~5 ha cerca del valle vitivinícola de Tacama (Ica) y ejecuta
 * backfill de índices (~30 días). Offline siempre; CDSE live con credenciales.
 *
 * Usage:
 *   npm run smoke:spectral-backfill-ica
 *   SMOKE_SENTINEL_LIVE=1 npm run smoke:spectral-backfill-ica
 *   SMOKE_NEON=1 SMOKE_SENTINEL_LIVE=1 npm run smoke:spectral-backfill-ica
 *   SMOKE_KEEP_PARCEL=1 …  # no borra la parcela en Neon (inspección manual / UI)
 */
import { BackfillParcelSpectralHistory } from "../src/application/spectral/backfill-parcel-spectral-history";
import { GetParcelSpectralHistory } from "../src/application/spectral/get-parcel-spectral-history";
import { DeleteOrgParcel, CreateOrgParcel } from "../src/application/parcel/mutate-org-parcels";
import {
  approximateAreaHectares,
  demoParcelSquare,
  polygonCentroid,
} from "../src/domain/parcel/geometry";
import { createDb } from "../src/infrastructure/db/client";
import { NeonParcelRegistry } from "../src/infrastructure/parcel/neon-parcel-registry";
import { SyntheticParcelRegistry } from "../src/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineSpectralSceneRegistry } from "../src/infrastructure/spectral/offline-spectral-scene-registry";
import { NeonSpectralSceneRegistry } from "../src/infrastructure/spectral/neon-spectral-scene-registry";
import { OfflineSpectralSource } from "../src/infrastructure/spectral/offline-spectral-source";
import {
  SENTINEL_HUB_SOURCE_ID,
  SentinelHubSpectralSource,
} from "../src/infrastructure/spectral/sentinel-hub-spectral-source";
import type { ParcelRegistry } from "../src/domain/parcel/types";
import type { SpectralSceneRegistry } from "../src/domain/spectral/scene-history";
import type { SpectralSource } from "../src/domain/spectral/types";

const orgId = "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G";
/** Plus + all org parcels (empty allowlist) — needed for dynamically created smoke parcels. */
const weatherPlusOrgWide = {
  userId: "smoke-spectral-ica",
  orgId,
  isActiveMember: true,
  entitlements: ["weather", "weather_plus"],
  authorizedParcelIds: [] as string[],
};

/** Valle de Ica — referencia agrícola cerca de Hacienda Tacama (vitivinícola). */
export const ICA_TACAMA_REFERENCE = {
  label: "Ica · valle Tacama (ref. hacienda vitivinícola)",
  longitude: -75.812,
  latitude: -14.0125,
  timezone: "America/Lima",
} as const;

const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
const BACKFILL_DAYS = Number.parseInt(process.env.SMOKE_BACKFILL_DAYS ?? "30", 10) || 30;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(msg);
  }
}

function createRegistries(): {
  parcels: ParcelRegistry;
  scenes: SpectralSceneRegistry;
  label: string;
} {
  if (process.env.SMOKE_NEON === "1") {
    assert(process.env.DATABASE_URL, "SMOKE_NEON=1 requires DATABASE_URL");
    return {
      parcels: new NeonParcelRegistry(createDb()),
      scenes: new NeonSpectralSceneRegistry(createDb()),
      label: "neon",
    };
  }
  return {
    parcels: new SyntheticParcelRegistry(),
    scenes: new OfflineSpectralSceneRegistry(),
    label: "offline",
  };
}

function createSpectralSource(): { source: SpectralSource; label: string } {
  if (process.env.SMOKE_SENTINEL_LIVE === "1") {
    const clientId = process.env.SENTINEL_CLIENT_ID;
    const clientSecret = process.env.SENTINEL_CLIENT_SECRET;
    assert(clientId && clientSecret, "SMOKE_SENTINEL_LIVE=1 requires SENTINEL_CLIENT_*");
    return {
      source: new SentinelHubSpectralSource({ clientId, clientSecret, cacheTtlMs: 0 }),
      label: "sentinel_hub",
    };
  }
  return { source: new OfflineSpectralSource(), label: "offline" };
}

async function runBackfillIcaSmoke() {
  const { parcels, scenes, label: registryLabel } = createRegistries();
  const { source, label: sourceLabel } = createSpectralSource();
  const create = new CreateOrgParcel(parcels);
  const del = new DeleteOrgParcel(parcels);
  const backfill = new BackfillParcelSpectralHistory(parcels, source, scenes);
  const history = new GetParcelSpectralHistory(parcels, scenes);

  const geometry = demoParcelSquare(ICA_TACAMA_REFERENCE.longitude, ICA_TACAMA_REFERENCE.latitude);
  const centroid = polygonCentroid(geometry);
  const areaHa = approximateAreaHectares(geometry);

  console.log(`\n▶ Spectral-9 backfill Ica [${registryLabel} + ${sourceLabel}]`);
  console.log(`  ${ICA_TACAMA_REFERENCE.label}`);
  console.log(
    `  centro ${centroid.latitude.toFixed(5)}, ${centroid.longitude.toFixed(5)} · ~${areaHa.toFixed(1)} ha`,
  );

  const created = await create.execute({
    authority: weatherPlusOrgWide,
    orgId,
    name: `Smoke Ica backfill ${stamp}`,
    geometry,
    timezone: ICA_TACAMA_REFERENCE.timezone,
  });
  assert(created.ok, `create parcel failed: ${!created.ok ? created.message : ""}`);
  const parcelId = created.data.id;
  console.log(`  parcela creada: ${parcelId}`);

  const steps: string[] = ["create"];

  const before = await history.execute({
    authority: weatherPlusOrgWide,
    parcelId,
    days: 90,
  });
  assert(before.ok, "history before backfill failed");
  assert(before.data.scenes.length === 0, "expected empty history before backfill");
  steps.push("history empty");

  const filled = await backfill.execute({
    authority: weatherPlusOrgWide,
    parcelId,
    days: BACKFILL_DAYS,
  });
  assert(filled.ok, `backfill failed: ${!filled.ok ? filled.message : ""}`);
  assert(filled.data.scenesFound >= 1, "backfill returned zero scenes");
  steps.push(`backfill ${filled.data.scenesFound} found`);

  if (sourceLabel === "sentinel_hub") {
    assert(
      filled.data.scenesFound >= 1,
      "live: expected at least one Sentinel scene in lookback window",
    );
    console.log(`  fechas CDSE: ${filled.data.acquisitionDates.join(", ")}`);
  } else {
    assert(filled.data.scenesFound >= 3, "offline: expected multiple synthetic scenes");
  }

  const after = await history.execute({
    authority: weatherPlusOrgWide,
    parcelId,
    days: 90,
  });
  assert(after.ok, "history after backfill failed");
  assert(
    after.data.scenes.length === filled.data.scenesFound,
    `history count ${after.data.scenes.length} !== scenesFound ${filled.data.scenesFound}`,
  );
  steps.push(`history ${after.data.scenes.length} rows`);

  const latest = after.data.scenes[after.data.scenes.length - 1];
  assert(latest, "missing latest scene");
  const ndre = latest.indices.find((item) => item.id === "ndre");
  console.log(
    `  última escena ${latest.acquisitionDate} · NDRE ${ndre?.value?.toFixed(4) ?? "—"} · ${latest.sourceLabel}`,
  );

  if (sourceLabel === "sentinel_hub") {
    assert(latest.sourceId === SENTINEL_HUB_SOURCE_ID, "live: unexpected source id");
  }

  const repeat = await backfill.execute({
    authority: weatherPlusOrgWide,
    parcelId,
    days: BACKFILL_DAYS,
  });
  assert(repeat.ok, "idempotent backfill failed");
  assert(repeat.data.scenesFound === filled.data.scenesFound, "idempotent scenesFound mismatch");
  steps.push("idempotent");

  if (process.env.SMOKE_KEEP_PARCEL === "1") {
    console.log(`  KEEP parcel ${parcelId} (SMOKE_KEEP_PARCEL=1)`);
  } else if (registryLabel === "neon") {
    const deleted = await del.execute({ authority: weatherPlus, orgId, parcelId });
    assert(deleted.ok, "delete parcel failed");
    steps.push("delete");
  }

  console.log(`PASS [${registryLabel}+${sourceLabel}] ${steps.join(" → ")}`);
  if (registryLabel === "neon" && process.env.SMOKE_KEEP_PARCEL === "1") {
    console.log(`  Abre la parcela en la app: ${parcelId}`);
  }
}

async function main() {
  console.log("Spectral-9 smoke — backfill Ica");
  await runBackfillIcaSmoke();

  if (process.env.SMOKE_SENTINEL_LIVE !== "1") {
    console.log("\nSKIP [sentinel_hub] set SMOKE_SENTINEL_LIVE=1 + SENTINEL_CLIENT_* for CDSE live");
  }
  if (process.env.SMOKE_NEON !== "1") {
    console.log("SKIP [neon] set SMOKE_NEON=1 to persist parcel/scenes in Neon");
  }
}

main().catch((error) => {
  console.error("FAIL", error);
  process.exit(1);
});
