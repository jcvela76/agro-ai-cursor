/**
 * Pre-client QA — automated gate before real-user pilot.
 *
 *   npm run qa:pre-client
 *   SMOKE_NEON=1 SMOKE_WEATHER_LIVE=1 SMOKE_SENTINEL_LIVE=1 npm run qa:pre-client
 *
 * See docs/ops/pre-client-qa.md for manual browser checklist.
 */
import { spawnSync } from "node:child_process";

function run(label: string, command: string, args: string[], env: NodeJS.ProcessEnv = process.env): void {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit ${result.status ?? "unknown"}`);
  }
}

function main(): void {
  console.log("Pre-client QA (automated)");
  console.log("Docs: docs/ops/pre-client-qa.md");

  run("unit tests", "npm", ["test"]);
  run("lint", "npm", ["run", "lint"]);

  run("smoke:all (+ stubs)", "npm", ["run", "smoke:all"], {
    ...process.env,
    SMOKE_SENAMHI: "1",
    SMOKE_SENTINEL_STUB: "1",
  });

  const contrastEnv = { ...process.env };
  run("smoke:report-contrast", "npm", ["run", "smoke:report-contrast"], contrastEnv);

  if (process.env.SMOKE_NEON === "1" || process.env.SMOKE_SENTINEL_LIVE === "1") {
    run("smoke:spectral-perf", "npm", ["run", "smoke:spectral-perf"], {
      ...process.env,
      SMOKE_NEON: process.env.SMOKE_NEON ?? "0",
      SMOKE_SENTINEL_LIVE: process.env.SMOKE_SENTINEL_LIVE ?? "0",
    });
  } else {
    console.log("\nNOTE: set SMOKE_NEON=1 SMOKE_SENTINEL_LIVE=1 for spectral-perf + live contrast");
  }

  console.log(`
────────────────────────────────────────
PASS qa:pre-client (automated)

Manual browser checklist (stg) — docs/ops/pre-client-qa.md
  M1  sign-in /app
  M2  Clima obs+forecast
  M3  parcela create/edit
  M4  Espectral índices/overlay/zonas
  M5  informe hídrico
  M6  briefing diario
  M7  Agente + evidencia
  M8  Perfil
  M9  Trace (si entitlement)
  M10 Review append
  M11 Admin
  M12 /legal/terms apex (RAW CODE, no DRAFT)
  M13 una org basta; sin fuga cross-org

Orgs: Clerk Organization = workspace/tenant (parcelas, plan, miembros).
MVP piloto: normalmente 1 org por cliente; multi-org es para consultor/holding.
────────────────────────────────────────
`);
}

try {
  main();
} catch (error) {
  console.error("FAIL qa:pre-client", error);
  process.exit(1);
}
