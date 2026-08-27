/**
 * Hygiene: remove Lima Coffee Review smoke decisions; keep fixture observe/recommend.
 *
 * Dry-run by default. Apply with APPLY=1.
 *
 *   npm run db:cleanup:review-smoke
 *   APPLY=1 npm run db:cleanup:review-smoke
 */
import { and, eq, inArray, like, notInArray, or } from "drizzle-orm";
import { createDb } from "../src/infrastructure/db/client";
import { reviewDecisions } from "../src/infrastructure/db/schema";

const ORG_ID = "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G";

/** Canonical seed fixtures — never delete. */
const KEEP_IDS = [
  "rev-lima-norte-observe-001",
  "rev-lima-norte-recommend-001",
] as const;

async function main() {
  const apply = process.env.APPLY === "1";
  const db = createDb(process.env.DATABASE_URL);

  const candidates = await db
    .select({
      id: reviewDecisions.id,
      summary: reviewDecisions.summary,
      evidenceRef: reviewDecisions.evidenceRef,
    })
    .from(reviewDecisions)
    .where(
      and(
        eq(reviewDecisions.orgId, ORG_ID),
        notInArray(reviewDecisions.id, [...KEEP_IDS]),
        or(
          like(reviewDecisions.summary, "Smoke%"),
          like(reviewDecisions.evidenceRef, "synthetic://smoke-review%"),
          like(reviewDecisions.evidenceRef, "ui-smoke-%"),
        ),
      ),
    );

  console.log(
    apply
      ? "APPLY: deleting Lima Coffee Review smoke decisions"
      : "DRY-RUN: set APPLY=1 to delete",
  );
  console.log(`keep fixtures: ${KEEP_IDS.join(", ")}`);
  console.log(`candidates (${candidates.length}):`);
  for (const row of candidates) {
    console.log(`  ${row.id}  ${row.summary}`);
  }

  if (!apply) {
    return;
  }

  if (candidates.length === 0) {
    console.log("DONE (nothing to delete)");
    return;
  }

  const ids = candidates.map((c) => c.id);
  await db
    .delete(reviewDecisions)
    .where(
      and(eq(reviewDecisions.orgId, ORG_ID), inArray(reviewDecisions.id, ids)),
    );
  console.log(`DONE deleted=${ids.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
