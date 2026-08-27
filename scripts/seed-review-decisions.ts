import { createDb } from "../src/infrastructure/db/client";
import { reviewDecisions } from "../src/infrastructure/db/schema";
import type { ReviewDecisionKind } from "../src/domain/review/types";
import seed from "../src/infrastructure/fixtures/review-decisions.json";

async function main() {
  const db = createDb(process.env.DATABASE_URL);

  for (const decision of seed.decisions) {
    await db
      .insert(reviewDecisions)
      .values({
        id: decision.id,
        orgId: decision.orgId,
        parcelId: decision.parcelId,
        kind: decision.kind as ReviewDecisionKind,
        summary: decision.summary,
        rationale: decision.rationale,
        actorId: decision.actorId,
        decidedAt: new Date(decision.decidedAt),
        evidenceRef:
          "evidenceRef" in decision ? (decision.evidenceRef as string) : null,
      })
      .onConflictDoUpdate({
        target: reviewDecisions.id,
        set: {
          orgId: decision.orgId,
          parcelId: decision.parcelId,
          kind: decision.kind as ReviewDecisionKind,
          summary: decision.summary,
          rationale: decision.rationale,
          actorId: decision.actorId,
          decidedAt: new Date(decision.decidedAt),
          evidenceRef:
            "evidenceRef" in decision ? (decision.evidenceRef as string) : null,
        },
      });
  }

  console.log(`Seeded ${seed.decisions.length} review decisions`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
