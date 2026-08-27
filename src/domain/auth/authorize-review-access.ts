import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";

export type ReviewAccessDenyReason =
  | "unauthenticated"
  | "inactive_member"
  | "missing_agronomic_review_entitlement"
  | "no_org";

export type ReviewAccessResult =
  | { ok: true }
  | { ok: false; reason: ReviewAccessDenyReason; publicCode: "REVIEW_UNAVAILABLE" };

export const REVIEW_UNAVAILABLE = {
  status: "REVIEW_UNAVAILABLE" as const,
  message: "Agronomic Review data is not available for this request.",
};

/**
 * Gate for Agronomic Review product. Org-scoped; parcel validated on append.
 */
export function authorizeAgronomicReviewAccess(
  authority: AccessSnapshot | null | undefined,
): ReviewAccessResult {
  if (!authority || !authority.userId) {
    return {
      ok: false,
      reason: "unauthenticated",
      publicCode: "REVIEW_UNAVAILABLE",
    };
  }

  if (!authority.isActiveMember) {
    return {
      ok: false,
      reason: "inactive_member",
      publicCode: "REVIEW_UNAVAILABLE",
    };
  }

  if (!authority.orgId) {
    return {
      ok: false,
      reason: "no_org",
      publicCode: "REVIEW_UNAVAILABLE",
    };
  }

  if (!authority.entitlements.includes("agronomic_review")) {
    return {
      ok: false,
      reason: "missing_agronomic_review_entitlement",
      publicCode: "REVIEW_UNAVAILABLE",
    };
  }

  return { ok: true };
}
