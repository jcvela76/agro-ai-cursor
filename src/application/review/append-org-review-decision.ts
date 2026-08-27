import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import { authorizeAgronomicReviewAccess } from "@/domain/auth/authorize-review-access";
import type { ParcelRegistry } from "@/domain/parcel/types";
import {
  REVIEW_DECISION_KINDS,
  type ReviewDecision,
  type ReviewDecisionKind,
  type ReviewDecisionRegistry,
} from "@/domain/review/types";

export type ReviewMutationDenyReason =
  | "unauthenticated"
  | "inactive_member"
  | "missing_agronomic_review_entitlement"
  | "no_org"
  | "invalid_input"
  | "cross_org_parcel";

export type ReviewMutationResult =
  | { ok: true; data: ReviewDecision }
  | { ok: false; reason: ReviewMutationDenyReason; message: string };

function isReviewDecisionKind(value: unknown): value is ReviewDecisionKind {
  return (
    typeof value === "string" &&
    (REVIEW_DECISION_KINDS as readonly string[]).includes(value)
  );
}

function isIsoDateTime(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

export class AppendOrgReviewDecision {
  constructor(
    private readonly reviews: ReviewDecisionRegistry,
    private readonly parcels: ParcelRegistry,
  ) {}

  async execute(input: {
    authority: AccessSnapshot | null | undefined;
    orgId: string | null | undefined;
    parcelId: string;
    kind: unknown;
    summary: string;
    rationale: string;
    actorId: string;
    decidedAt?: string | null;
    evidenceRef?: string | null;
  }): Promise<ReviewMutationResult> {
    const access = authorizeAgronomicReviewAccess(input.authority);
    if (!access.ok) {
      return {
        ok: false,
        reason: access.reason,
        message: "Agronomic Review data is not available for this request.",
      };
    }

    const orgId = input.orgId ?? input.authority!.orgId;
    if (!orgId || input.authority!.orgId !== orgId) {
      return {
        ok: false,
        reason: "no_org",
        message: "Agronomic Review data is not available for this request.",
      };
    }

    const parcelId = input.parcelId.trim();
    const summary = input.summary.trim();
    const rationale = input.rationale.trim();
    const actorId = input.actorId.trim();
    const evidenceRef = input.evidenceRef?.trim() || undefined;
    const decidedAt = (input.decidedAt?.trim() || new Date().toISOString()).trim();

    if (!parcelId || !summary || !rationale || !actorId) {
      return {
        ok: false,
        reason: "invalid_input",
        message: "parcelId, summary, rationale and actorId are required",
      };
    }

    if (!isReviewDecisionKind(input.kind)) {
      return {
        ok: false,
        reason: "invalid_input",
        message: "kind must be observe | recommend | decide",
      };
    }

    if (!isIsoDateTime(decidedAt)) {
      return {
        ok: false,
        reason: "invalid_input",
        message: "decidedAt must be a valid ISO datetime",
      };
    }

    const parcel = await this.parcels.getParcel(parcelId);
    if (!parcel || parcel.orgId !== orgId) {
      return {
        ok: false,
        reason: "cross_org_parcel",
        message: "Parcel is not available in this organization",
      };
    }

    const data = await this.reviews.appendDecision({
      orgId,
      parcelId,
      kind: input.kind,
      summary,
      rationale,
      actorId,
      decidedAt,
      evidenceRef,
    });
    return { ok: true, data };
  }
}
