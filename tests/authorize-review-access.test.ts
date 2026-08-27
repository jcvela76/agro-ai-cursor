import { describe, expect, it } from "vitest";
import { authorizeAgronomicReviewAccess } from "@/domain/auth/authorize-review-access";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";

describe("authorizeAgronomicReviewAccess", () => {
  it("denies without entitlement", () => {
    const result = authorizeAgronomicReviewAccess(defaultSyntheticSnapshots[0]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("missing_agronomic_review_entitlement");
    }
  });

  it("allows active member with agronomic_review", () => {
    const result = authorizeAgronomicReviewAccess(defaultSyntheticSnapshots[7]);
    expect(result.ok).toBe(true);
  });

  it("denies unauthenticated", () => {
    const result = authorizeAgronomicReviewAccess(null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("unauthenticated");
    }
  });
});
