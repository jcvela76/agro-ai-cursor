/** Agronomic Review domain — Review-1 append-only decisions (ADR-025). */

export type ReviewDecisionKind = "observe" | "recommend" | "decide";

export const REVIEW_DECISION_KINDS: readonly ReviewDecisionKind[] = [
  "observe",
  "recommend",
  "decide",
] as const;

export interface ReviewDecision {
  id: string;
  orgId: string;
  parcelId: string;
  kind: ReviewDecisionKind;
  summary: string;
  rationale: string;
  actorId: string;
  decidedAt: string;
  evidenceRef?: string;
}

export interface AppendReviewDecisionInput {
  orgId: string;
  parcelId: string;
  kind: ReviewDecisionKind;
  summary: string;
  rationale: string;
  actorId: string;
  decidedAt: string;
  evidenceRef?: string;
}

export interface ReviewDecisionRegistry {
  listDecisionsByOrg(orgId: string): Promise<ReviewDecision[]>;
  appendDecision(input: AppendReviewDecisionInput): Promise<ReviewDecision>;
}
