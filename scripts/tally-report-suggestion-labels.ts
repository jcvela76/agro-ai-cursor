/**
 * Tally Agronomic Review labels that score report/briefing suggestions.
 *
 * Convention (rationale or summary):
 *   report:<id> suggestion:<theme> verdict:agree|disagree|partial
 *
 * Usage:
 *   npm run tally:report-suggestion-labels
 *   SMOKE_NEON=1 npm run tally:report-suggestion-labels
 *   SMOKE_ORG_ID=org_… SMOKE_PARCEL_ID=parcel-… npm run tally:report-suggestion-labels
 */
import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import {
  formatSuggestionLabel,
  parseSuggestionLabelFromDecision,
  tallySuggestionLabels,
} from "../src/domain/report/suggestion-label";
import { createDb } from "../src/infrastructure/db/client";
import { NeonReviewDecisionRegistry } from "../src/infrastructure/review/neon-review-registry";
import { OfflineReviewDecisionRegistry } from "../src/infrastructure/review/offline-review-registry";

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

const DEFAULT_ORG = "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G";

async function main(): Promise<void> {
  const neon = process.env.SMOKE_NEON === "1";
  const orgId = process.env.SMOKE_ORG_ID?.trim() || DEFAULT_ORG;
  const parcelFilter = process.env.SMOKE_PARCEL_ID?.trim();

  const registry = neon
    ? new NeonReviewDecisionRegistry(createDb())
    : new OfflineReviewDecisionRegistry();

  if (neon && !process.env.DATABASE_URL) {
    throw new Error("SMOKE_NEON=1 requires DATABASE_URL");
  }

  let decisions = await registry.listDecisionsByOrg(orgId);
  if (parcelFilter) {
    decisions = decisions.filter((d) => d.parcelId === parcelFilter);
  }

  const labels = decisions
    .map((d) => parseSuggestionLabelFromDecision(d))
    .filter((x): x is NonNullable<typeof x> => x != null);

  console.log(
    `Suggestion labels — org=${orgId}${parcelFilter ? ` parcel=${parcelFilter}` : ""} source=${neon ? "neon" : "offline-fixture"}`,
  );
  console.log(`Decisions scanned: ${decisions.length}; labels found: ${labels.length}`);
  console.log(
    `Example tag: ${formatSuggestionLabel({ reportId: "rpt-…", theme: "water", verdict: "agree" })}`,
  );

  if (labels.length === 0) {
    console.log("No suggestion labels yet — append Review decisions with the tag above.");
    return;
  }

  const tallies = tallySuggestionLabels(labels);
  console.log("\nTheme         agree  disagree  partial  total  agreeRate");
  for (const t of tallies) {
    const rate =
      t.agreeRate == null ? "—" : `${(t.agreeRate * 100).toFixed(0)}%`;
    console.log(
      `${t.theme.padEnd(12)} ${String(t.agree).padStart(5)}  ${String(t.disagree).padStart(8)}  ${String(t.partial).padStart(7)}  ${String(t.total).padStart(5)}  ${rate}`,
    );
  }

  for (const label of labels.slice(0, 20)) {
    console.log(`  · ${label.raw}`);
  }
  if (labels.length > 20) {
    console.log(`  … +${labels.length - 20} more`);
  }
}

main().catch((error) => {
  console.error("FAIL", error);
  process.exit(1);
});
