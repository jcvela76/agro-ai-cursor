/**
 * QA-8 — run all offline smoke scripts in sequence.
 *
 * Usage:
 *   npm run smoke:all
 *   SMOKE_SENAMHI=1 SMOKE_SENTINEL_STUB=1 npm run smoke:all
 */
import { spawnSync } from "node:child_process";

const scripts = [
  "smoke:parcels",
  "smoke:subscription-parcels",
  "smoke:weather",
  "smoke:spectral",
  "smoke:agent",
  "smoke:trace",
  "smoke:trace-eudr",
  "smoke:review",
  "smoke:admin",
] as const;

function run(label: string): void {
  console.log(`\n▶ ${label}`);
  const result = spawnSync("npm", ["run", label], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit ${result.status ?? "unknown"}`);
  }
}

function main() {
  console.log("QA-8 smoke:all");
  const passed: string[] = [];
  for (const script of scripts) {
    run(script);
    passed.push(script);
  }
  console.log(`\nPASS smoke:all (${passed.length}/${scripts.length})`);
  if (process.env.SMOKE_SENAMHI !== "1") {
    console.log("NOTE: set SMOKE_SENAMHI=1 to include senamhi_stub weather gate in smoke:weather");
  }
  if (process.env.SMOKE_SENTINEL_STUB !== "1") {
    console.log("NOTE: set SMOKE_SENTINEL_STUB=1 to include sentinel_hub_stub in smoke:spectral");
  }
  if (process.env.SMOKE_NEON !== "1") {
    console.log("NOTE: set SMOKE_NEON=1 to include Neon persistence smokes (parcels/trace/review)");
  }
}

try {
  main();
} catch (error) {
  console.error("FAIL", error);
  process.exit(1);
}
