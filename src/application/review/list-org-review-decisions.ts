import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import { authorizeAgronomicReviewAccess } from "@/domain/auth/authorize-review-access";
import type {
  ReviewDecision,
  ReviewDecisionRegistry,
} from "@/domain/review/types";

export type ListOrgReviewDecisionsResult =
  | { ok: true; data: ReviewDecision[] }
  | {
      ok: false;
      reason:
        | "unauthenticated"
        | "inactive_member"
        | "missing_agronomic_review_entitlement"
        | "no_org";
      message: string;
    };

export class ListOrgReviewDecisions {
  constructor(private readonly reviews: ReviewDecisionRegistry) {}

  async execute(input: {
    authority: AccessSnapshot | null | undefined;
    orgId: string | null | undefined;
    parcelId?: string | null;
  }): Promise<ListOrgReviewDecisionsResult> {
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

    let data = await this.reviews.listDecisionsByOrg(orgId);
    const parcelId = input.parcelId?.trim();
    if (parcelId) {
      data = data.filter((d) => d.parcelId === parcelId);
    }
    return { ok: true, data };
  }
}
