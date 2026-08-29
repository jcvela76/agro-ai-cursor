/**
 * Spectral Perf smoke — mide latencias de índices / zonas (cold vs cache) y
 * precompute tipo cron (Perf-5).
 *
 * Offline siempre. CDSE + Neon opcionales:
 *
 *   npm run smoke:spectral-perf
 *   SMOKE_SENTINEL_LIVE=1 npm run smoke:spectral-perf
 *   SMOKE_NEON=1 SMOKE_SENTINEL_LIVE=1 npm run smoke:spectral-perf
 *   SMOKE_PARCEL_ID=parcel-… SMOKE_NEON=1 SMOKE_SENTINEL_LIVE=1 npm run smoke:spectral-perf
 *
 * Por defecto con Neon usa la parcela Ica smoke si existe; si no, lima sintética
 * (solo offline) o falla si pedís live sin parcela con geometría.
 */
import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { GetParcelSpectralZones } from "../src/application/spectral/get-parcel-spectral-zones";
import { GetParcelVegetationIndices } from "../src/application/spectral/get-parcel-vegetation-indices";
import { VEGETATION_INDEX_ORDER } from "../src/domain/spectral/vegetation-indices";
import type { ParcelRegistry } from "../src/domain/parcel/types";
import type { SpectralZoneSnapshotRegistry } from "../src/domain/spectral/zone-history";
import type { SpectralSource } from "../src/domain/spectral/types";
import { createDb } from "../src/infrastructure/db/client";
import { NeonParcelRegistry } from "../src/infrastructure/parcel/neon-parcel-registry";
import { SyntheticParcelRegistry } from "../src/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineSpectralSceneRegistry } from "../src/infrastructure/spectral/offline-spectral-scene-registry";
import { NeonSpectralSceneRegistry } from "../src/infrastructure/spectral/neon-spectral-scene-registry";
import { OfflineSpectralSource } from "../src/infrastructure/spectral/offline-spectral-source";
import { OfflineSpectralZoneSnapshotRegistry } from "../src/infrastructure/spectral/offline-spectral-zone-snapshot-registry";
import { NeonSpectralZoneSnapshotRegistry } from "../src/infrastructure/spectral/neon-spectral-zone-snapshot-registry";
import {
  SENTINEL_HUB_SOURCE_ID,
  SentinelHubSpectralSource,
} from "../src/infrastructure/spectral/sentinel-hub-spectral-source";

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const ORG_PLUS = "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G";
/** Known Ica smoke parcel from Spectral-9 keep run (may be absent). */
const DEFAULT_ICA_PARCEL = "parcel-77ca04c8-8fd6-4bb4-9e53-303d8a4c4f57";
const SYNTHETIC_PARCEL = "parcel-lima-norte-001";

const weatherPlus = {
  userId: "smoke-spectral-perf",
  orgId: ORG_PLUS,
  isActiveMember: true,
  entitlements: ["weather", "weather_plus"] as const,
  authorizedParcelIds: [] as string[],
};

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(msg);
  }
}

function ms(started: number): number {
  return Math.round(performance.now() - started);
}

function fmt(msValue: number): string {
  if (msValue < 1000) return `${msValue} ms`;
  return `${(msValue / 1000).toFixed(2)} s`;
}

type TimingRow = { step: string; ms: number; note?: string };

async function resolveParcelId(parcels: ParcelRegistry, preferNeon: boolean): Promise<string> {
  const fromEnv = process.env.SMOKE_PARCEL_ID?.trim();
  if (fromEnv) {
    const p = await parcels.getParcel(fromEnv);
    assert(p?.geometry, `SMOKE_PARCEL_ID=${fromEnv} missing or without geometry`);
    return fromEnv;
  }
  if (preferNeon) {
    const ica = await parcels.getParcel(DEFAULT_ICA_PARCEL);
    if (ica?.geometry) {
      return DEFAULT_ICA_PARCEL;
    }
  }
  const lima = await parcels.getParcel(SYNTHETIC_PARCEL);
  assert(lima?.geometry, "synthetic lima parcel missing");
  return SYNTHETIC_PARCEL;
}

function createStack(): {
  parcels: ParcelRegistry;
  source: SpectralSource;
  zones: SpectralZoneSnapshotRegistry;
  scenesLabel: string;
  sourceLabel: string;
} {
  const live = process.env.SMOKE_SENTINEL_LIVE === "1";
  const neon = process.env.SMOKE_NEON === "1";

  if (neon) {
    assert(process.env.DATABASE_URL, "SMOKE_NEON=1 requires DATABASE_URL");
  }
  if (live) {
    assert(
      process.env.SENTINEL_CLIENT_ID && process.env.SENTINEL_CLIENT_SECRET,
      "SMOKE_SENTINEL_LIVE=1 requires SENTINEL_CLIENT_*",
    );
  }

  const db = neon ? createDb() : null;
  const parcels = neon && db ? new NeonParcelRegistry(db) : new SyntheticParcelRegistry();
  const zones =
    neon && db
      ? new NeonSpectralZoneSnapshotRegistry(db)
      : new OfflineSpectralZoneSnapshotRegistry();
  const source = live
    ? new SentinelHubSpectralSource({
        clientId: process.env.SENTINEL_CLIENT_ID!,
        clientSecret: process.env.SENTINEL_CLIENT_SECRET!,
        cacheTtlMs: 0,
      })
    : new OfflineSpectralSource();

  return {
    parcels,
    source,
    zones,
    scenesLabel: neon ? "neon" : "offline",
    sourceLabel: live ? SENTINEL_HUB_SOURCE_ID : "offline",
  };
}

async function runPerfSmoke() {
  const { parcels, source, zones, scenesLabel, sourceLabel } = createStack();
  const parcelId = await resolveParcelId(parcels, scenesLabel === "neon");
  const parcel = await parcels.getParcel(parcelId);
  assert(parcel?.geometry, "parcel geometry required");

  // Scene registry only needed for indices persist path when using GetParcelVegetationIndices
  const scenes =
    scenesLabel === "neon" && process.env.DATABASE_URL
      ? new NeonSpectralSceneRegistry(createDb())
      : new OfflineSpectralSceneRegistry();

  const getIndices = new GetParcelVegetationIndices(parcels, source, scenes);
  const getZones = new GetParcelSpectralZones(parcels, source, zones);

  const rows: TimingRow[] = [];
  console.log(`\n▶ Spectral Perf smoke [${scenesLabel} + ${sourceLabel}]`);
  console.log(`  parcela ${parcelId} · ${parcel.name}`);

  // --- Indices ---
  const t0 = performance.now();
  const idx = await getIndices.execute({
    authority: weatherPlus,
    parcelId,
    persistMode: "always",
  });
  const indicesMs = ms(t0);
  assert(idx.ok, `indices failed: ${!idx.ok ? idx.message : ""}`);
  rows.push({
    step: "indices (live/source)",
    ms: indicesMs,
    note: `${idx.data.indices.length} idx · ${idx.data.evidence.acquiredAt.slice(0, 10)}`,
  });

  const acquiredAt = idx.data.evidence.acquiredAt;
  const sourceId = idx.data.evidence.sourceId;
  const ndreMean = idx.data.indices.find((i) => i.id === "ndre")?.value ?? null;

  // --- Zones cold (Process or synthetic) ---
  const t1 = performance.now();
  const cold = await getZones.execute({
    authority: weatherPlus,
    parcelId,
    indexId: "ndre",
    acquiredAt,
    parcelMean: ndreMean,
    sourceId,
    refresh: true,
  });
  const coldMs = ms(t1);
  assert(cold.ok, `zones cold failed: ${!cold.ok ? cold.message : ""}`);
  rows.push({
    step: "zones NDRE cold (refresh=1)",
    ms: coldMs,
    note: cold.data.evidence.freshnessPolicy.includes("zones_fishnet_process_1")
      ? "process_1"
      : cold.data.evidence.freshnessPolicy.includes("zones_fishnet_3")
        ? "statistical_fallback"
        : cold.data.evidence.freshnessPolicy.includes("zones_synthetic")
          ? "synthetic"
          : cold.data.methodId,
  });

  // --- Zones cache hit ---
  const t2 = performance.now();
  const warm = await getZones.execute({
    authority: weatherPlus,
    parcelId,
    indexId: "ndre",
    acquiredAt,
    parcelMean: ndreMean,
    sourceId,
  });
  const warmMs = ms(t2);
  assert(warm.ok, `zones warm failed: ${!warm.ok ? warm.message : ""}`);
  assert(
    warm.data.evidence.freshnessPolicy.includes("zones_cache_read"),
    `expected zones_cache_read, got ${warm.data.evidence.freshnessPolicy}`,
  );
  rows.push({
    step: "zones NDRE cache hit",
    ms: warmMs,
    note: "zones_cache_read",
  });

  // --- Perf-5 style: precompute remaining catalog indices (skip ndre already done) ---
  const means = new Map(idx.data.indices.map((i) => [i.id, i.value] as const));
  const toPrecompute = VEGETATION_INDEX_ORDER.filter((id) => id !== "ndre");
  const t3 = performance.now();
  let precomputed = 1; // ndre already
  for (const indexId of toPrecompute) {
    const result = await getZones.execute({
      authority: weatherPlus,
      parcelId,
      indexId,
      acquiredAt,
      parcelMean: means.get(indexId) ?? null,
      sourceId,
      refresh: true,
    });
    if (result.ok) {
      precomputed += 1;
    } else {
      console.warn(`  precompute ${indexId}: ${result.message}`);
    }
  }
  const precomputeMs = ms(t3);
  rows.push({
    step: `precompute remaining ${toPrecompute.length} indices`,
    ms: precomputeMs,
    note: `${precomputed}/${VEGETATION_INDEX_ORDER.length} total OK`,
  });

  // --- Spot-check one other index is now cache ---
  const t4 = performance.now();
  const eviWarm = await getZones.execute({
    authority: weatherPlus,
    parcelId,
    indexId: "evi",
    acquiredAt,
    parcelMean: means.get("evi") ?? null,
    sourceId,
  });
  const eviWarmMs = ms(t4);
  assert(eviWarm.ok, "evi warm failed");
  assert(
    eviWarm.data.evidence.freshnessPolicy.includes("zones_cache_read"),
    "evi expected cache hit after precompute",
  );
  rows.push({
    step: "zones EVI cache hit (post-precompute)",
    ms: eviWarmMs,
    note: "zones_cache_read",
  });

  const totalMs = rows.reduce((acc, r) => acc + r.ms, 0);

  console.log("\n  timings");
  console.log("  " + "-".repeat(72));
  for (const row of rows) {
    const note = row.note ? `  (${row.note})` : "";
    console.log(`  ${row.step.padEnd(42)} ${fmt(row.ms).padStart(10)}${note}`);
  }
  console.log("  " + "-".repeat(72));
  console.log(`  ${"TOTAL (sum of steps)".padEnd(42)} ${fmt(totalMs).padStart(10)}`);
  console.log(
    `\n  speedup NDRE cold→cache: ${coldMs > 0 ? (coldMs / Math.max(warmMs, 1)).toFixed(1) : "—"}×`,
  );
  console.log(`\n✓ spectral-perf OK (${rows.length} steps)\n`);
}

runPerfSmoke().catch((error) => {
  console.error("\n✗ spectral-perf FAILED");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
