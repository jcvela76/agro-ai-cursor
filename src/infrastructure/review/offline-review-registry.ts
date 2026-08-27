import { randomUUID } from "node:crypto";
import type {
  AppendReviewDecisionInput,
  ReviewDecision,
  ReviewDecisionRegistry,
} from "@/domain/review/types";
import fixture from "@/infrastructure/fixtures/review-decisions.json";

interface ReviewFixtureFile {
  decisions: ReviewDecision[];
}

/** In-memory append-only registry for tests / local without DATABASE_URL. */
export class OfflineReviewDecisionRegistry implements ReviewDecisionRegistry {
  private readonly decisions: ReviewDecision[];

  constructor(data: ReviewFixtureFile = fixture as ReviewFixtureFile) {
    this.decisions = data.decisions.map((d) => ({ ...d }));
  }

  async listDecisionsByOrg(orgId: string): Promise<ReviewDecision[]> {
    return this.decisions
      .filter((d) => d.orgId === orgId)
      .slice()
      .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
  }

  async appendDecision(input: AppendReviewDecisionInput): Promise<ReviewDecision> {
    const decision: ReviewDecision = {
      id: `rev-${randomUUID()}`,
      orgId: input.orgId,
      parcelId: input.parcelId,
      kind: input.kind,
      summary: input.summary,
      rationale: input.rationale,
      actorId: input.actorId,
      decidedAt: input.decidedAt,
      ...(input.evidenceRef ? { evidenceRef: input.evidenceRef } : {}),
    };
    this.decisions.push(decision);
    return { ...decision };
  }
}
