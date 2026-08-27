import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import type {
  AppendReviewDecisionInput,
  ReviewDecision,
  ReviewDecisionRegistry,
} from "@/domain/review/types";
import type { Db } from "@/infrastructure/db/client";
import { reviewDecisions } from "@/infrastructure/db/schema";

export class NeonReviewDecisionRegistry implements ReviewDecisionRegistry {
  constructor(private readonly db: Db) {}

  async listDecisionsByOrg(orgId: string): Promise<ReviewDecision[]> {
    const rows = await this.db
      .select()
      .from(reviewDecisions)
      .where(eq(reviewDecisions.orgId, orgId))
      .orderBy(desc(reviewDecisions.decidedAt));
    return rows.map((row) => this.toDecision(row));
  }

  async appendDecision(input: AppendReviewDecisionInput): Promise<ReviewDecision> {
    const rows = await this.db
      .insert(reviewDecisions)
      .values({
        id: `rev-${randomUUID()}`,
        orgId: input.orgId,
        parcelId: input.parcelId,
        kind: input.kind,
        summary: input.summary,
        rationale: input.rationale,
        actorId: input.actorId,
        decidedAt: new Date(input.decidedAt),
        evidenceRef: input.evidenceRef ?? null,
      })
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error("Failed to insert review decision");
    }
    return this.toDecision(row);
  }

  private toDecision(row: typeof reviewDecisions.$inferSelect): ReviewDecision {
    return {
      id: row.id,
      orgId: row.orgId,
      parcelId: row.parcelId,
      kind: row.kind,
      summary: row.summary,
      rationale: row.rationale,
      actorId: row.actorId,
      decidedAt: row.decidedAt.toISOString(),
      ...(row.evidenceRef ? { evidenceRef: row.evidenceRef } : {}),
    };
  }
}
