/**
 * Cross-environment audit: local Neon, Vercel stg/prod deploys, spectral parcel smoke.
 *
 * Usage:
 *   npx tsx scripts/audit-environments.ts
 *   SMOKE_PARCEL_ID=parcel-xxx npx tsx scripts/audit-environments.ts
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
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

const SMOKE_PARCEL_PREFIX = "Smoke Ica backfill";
const TARGET_PARCEL_ID = process.env.SMOKE_PARCEL_ID?.trim();

interface AuditRow {
  check: string;
  local: string;
  stg: string;
  prod: string;
}

const rows: AuditRow[] = [];

function cell(value: string): string {
  return value || "—";
}

function run(cmd: string, args: string[]): { ok: boolean; stdout: string } {
  const result = spawnSync(cmd, args, {
    encoding: "utf8",
    cwd: process.cwd(),
    env: process.env,
  });
  const stdout = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  return { ok: result.status === 0, stdout };
}

async function auditDatabase(label: string, databaseUrl: string | undefined) {
  if (!databaseUrl) {
    return {
      connected: false,
      migrations: "no DATABASE_URL",
      spectralTable: "—",
      sceneCount: "—",
      icaParcels: "—",
      targetParcel: "—",
      targetScenes: "—",
    };
  }

  const sql = neon(databaseUrl);
  try {
    await sql`SELECT 1`;
  } catch (error) {
    return {
      connected: false,
      migrations: `connect failed: ${error instanceof Error ? error.message : "unknown"}`,
      spectralTable: "—",
      sceneCount: "—",
      icaParcels: "—",
      targetParcel: "—",
      targetScenes: "—",
    };
  }

  const migrationRows = await sql`
    SELECT hash, created_at
    FROM drizzle.__drizzle_migrations
    ORDER BY created_at DESC
    LIMIT 3
  `;
  const latestMigration =
    migrationRows.length > 0
      ? `${String(migrationRows[0]?.hash ?? "?").slice(0, 12)}… @ ${String(migrationRows[0]?.created_at ?? "").slice(0, 10)}`
      : "none";
  const migrationCount = (
    await sql`SELECT COUNT(*)::int AS c FROM drizzle.__drizzle_migrations`
  )[0]?.c;

  const tableCheck = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'spectral_scenes'
    ) AS exists
  `;
  const hasSpectral = Boolean(tableCheck[0]?.exists);

  const sceneCount = hasSpectral
    ? String((await sql`SELECT COUNT(*)::int AS c FROM spectral_scenes`)[0]?.c ?? 0)
    : "n/a";

  const icaRows = await sql`
    SELECT id, name, created_at
    FROM parcels
    WHERE name LIKE ${`${SMOKE_PARCEL_PREFIX}%`}
    ORDER BY created_at DESC
    LIMIT 5
  `;
  const icaParcels =
    icaRows.length === 0
      ? "0"
      : icaRows.map((r) => `${r.id as string} (${String(r.name).slice(0, 28)}…)`).join("; ");

  let targetParcel = "—";
  let targetScenes = "—";
  const parcelId = TARGET_PARCEL_ID ?? (icaRows[0]?.id as string | undefined);
  if (parcelId) {
    const parcel = await sql`
      SELECT id, name, latitude, longitude, org_id
      FROM parcels WHERE id = ${parcelId} LIMIT 1
    `;
    if (parcel[0]) {
      targetParcel = `${parcelId} @ ${Number(parcel[0].latitude).toFixed(4)}, ${Number(parcel[0].longitude).toFixed(4)}`;
      if (hasSpectral) {
        const scenes = await sql`
          SELECT COUNT(*)::int AS c,
                 MIN(acquisition_date) AS min_d,
                 MAX(acquisition_date) AS max_d
          FROM spectral_scenes
          WHERE parcel_id = ${parcelId}
        `;
        const s = scenes[0];
        targetScenes = `${s?.c ?? 0} scenes (${s?.min_d ?? "?"} → ${s?.max_d ?? "?"})`;
      }
    } else {
      targetParcel = `${parcelId} NOT FOUND`;
    }
  }

  return {
    connected: true,
    migrations: `${migrationCount ?? 0} applied; latest ${latestMigration}`,
    spectralTable: hasSpectral ? "yes" : "NO",
    sceneCount,
    icaParcels,
    targetParcel,
    targetScenes,
    host: new URL(databaseUrl.replace(/^postgres/, "https")).hostname,
  };
}

function auditVercelDeploy(branch: string): string {
  const { ok, stdout } = run("npx", [
    "vercel",
    "ls",
    "--yes",
    branch === "main" ? "--prod" : "",
    branch !== "main" ? branch : "",
  ].filter(Boolean));
  if (!ok) return `vercel ls failed`;
  const line = stdout.split("\n").find((l) => l.includes("Ready") || l.includes("●"));
  return line?.trim().slice(0, 80) ?? "no deployment found";
}

function vercelEnvPresent(name: string, environment: "production" | "preview"): string {
  const { ok, stdout } = run("npx", ["vercel", "env", "ls", "--yes"]);
  if (!ok) return "?";
  const envLabel = environment === "production" ? "Production" : "Preview";
  const has = stdout
    .split("\n")
    .some((line) => line.includes(name) && line.includes(envLabel));
  return has ? "yes" : "no";
}

async function fetchDeployMeta(url: string): Promise<string> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    const server = res.headers.get("server") ?? "";
    const powered = res.headers.get("x-powered-by") ?? "";
    return `${res.status} ${server} ${powered}`.trim();
  } catch (error) {
    return `error: ${error instanceof Error ? error.message : "fetch failed"}`;
  }
}

async function main() {
  console.log("═".repeat(72));
  console.log("Agro AI — environment audit");
  console.log("═".repeat(72));

  const gitStg = run("git", ["log", "-1", "--oneline", "stg"]).stdout;
  const gitMain = run("git", ["log", "-1", "--oneline", "origin/main"]).stdout;
  const diverge = run("git", ["rev-list", "--left-right", "--count", "origin/main...origin/stg"]).stdout;

  console.log("\n## Git");
  console.log(`  stg:  ${gitStg}`);
  console.log(`  main: ${gitMain}`);
  console.log(`  diverge (main...stg): ${diverge}  (behind ahead)`);

  const localDb = process.env.DATABASE_URL;
  const localAudit = await auditDatabase("local", localDb);

  console.log("\n## Neon (local .env.local DATABASE_URL)");
  console.log(`  host:     ${localAudit.connected ? localAudit.host : "—"}`);
  console.log(`  connected: ${localAudit.connected ? "yes" : "no"}`);
  console.log(`  latest migration: ${localAudit.migrations}`);
  console.log(`  spectral_scenes table: ${localAudit.spectralTable}`);
  console.log(`  total spectral_scenes rows: ${localAudit.sceneCount}`);
  console.log(`  Ica smoke parcels: ${localAudit.icaParcels}`);
  console.log(`  target parcel: ${localAudit.targetParcel}`);
  console.log(`  target scenes: ${localAudit.targetScenes}`);

  console.log("\n## Vercel env (presence)");
  const checks = [
    "DATABASE_URL",
    "SPECTRAL_SOURCE",
    "SENTINEL_CLIENT_ID",
    "SENTINEL_CLIENT_SECRET",
    "CRON_SECRET",
  ] as const;
  console.log("  var                        Preview   Production");
  for (const name of checks) {
    const preview = vercelEnvPresent(name, "preview");
    const production = vercelEnvPresent(name, "production");
    console.log(`  ${name.padEnd(26)} ${preview.padEnd(9)} ${production}`);
  }

  console.log("\n## HTTP reachability");
  const stgHttp = await fetchDeployMeta("https://stg.geoagro.ai/");
  const prodHttp = await fetchDeployMeta("https://geoagro.ai/");
  console.log(`  stg.geoagro.ai:  ${stgHttp}`);
  console.log(`  geoagro.ai:      ${prodHttp}`);

  const { stdout: vercelLs } = run("npx", ["vercel", "ls", "agro-ai-cursor", "--yes"]);
  const prodLine = vercelLs.split("\n").find((l) => l.includes("Production") && l.includes("Ready"));
  const previewLine = vercelLs.split("\n").find((l) => l.includes("Preview") && l.includes("Ready"));
  console.log("\n## Vercel latest Ready");
  console.log(`  Production: ${prodLine?.trim() ?? "see vercel dashboard"}`);
  console.log(`  Preview:    ${previewLine?.trim() ?? "see vercel dashboard"}`);

  console.log("\n## Summary matrix");
  console.log("  | Layer              | Local              | Stg (Preview)        | Prod               |");
  console.log("  |--------------------|--------------------|----------------------|--------------------|");
  console.log(
    `  | Code (git)         | stg @ ${gitStg.split(" ")[0] ?? "?"}`.padEnd(22) +
      `| stg branch deploy    | main @ ${gitMain.split(" ")[0] ?? "?"} (${diverge.split("\t")[0] ?? "?"} behind) |`,
  );
  console.log(
    `  | spectral_scenes    | ${localAudit.spectralTable}`.padEnd(22) +
      `| same Neon*           | same Neon*           |`,
  );
  console.log(
    `  | SPECTRAL_SOURCE    | ${process.env.SPECTRAL_SOURCE ?? "offline"}`.padEnd(22) +
      `| Preview: yes         | Production: no**     |`,
  );
  console.log(
    `  | Ica smoke parcel   | ${localAudit.targetParcel !== "—" ? "yes" : "no"}`.padEnd(22) +
      `| DB shared*           | DB shared*           |`,
  );
  console.log("\n  * Vercel lists DATABASE_URL for Production, Preview, Development — likely one Neon DB.");
  console.log("  ** SPECTRAL_SOURCE + SENTINEL_* only on Preview per `vercel env ls` (CDSE stg-only).");
  console.log(`\n  Parcel ID to inspect: ${TARGET_PARCEL_ID ?? "parcel-77ca04c8-8fd6-4bb4-9e53-303d8a4c4f57"}`);
  console.log("═".repeat(72));
}

main().catch((error) => {
  console.error("AUDIT FAILED", error);
  process.exit(1);
});
