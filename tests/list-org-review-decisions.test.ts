import { describe, expect, it } from "vitest";
import { ListOrgReviewDecisions } from "@/application/review/list-org-review-decisions";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { OfflineReviewDecisionRegistry } from "@/infrastructure/review/offline-review-registry";

describe("Review-1: list org review decisions", () => {
  const registry = new OfflineReviewDecisionRegistry();
  const useCase = new ListOrgReviewDecisions(registry);
  const orgId = "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G";

  it("denies weather-only user", async () => {
    const result = await useCase.execute({
      authority: defaultSyntheticSnapshots[0],
      orgId,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("missing_agronomic_review_entitlement");
    }
  });

  it("returns fixtures for entitled org", async () => {
    const result = await useCase.execute({
      authority: defaultSyntheticSnapshots[7],
      orgId,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBeGreaterThanOrEqual(2);
      expect(result.data.every((d) => d.orgId === orgId)).toBe(true);
      expect(JSON.stringify(result.data)).not.toContain("coordinates");
    }
  });

  it("filters by parcelId", async () => {
    const result = await useCase.execute({
      authority: defaultSyntheticSnapshots[7],
      orgId,
      parcelId: "parcel-lima-norte-001",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.every((d) => d.parcelId === "parcel-lima-norte-001")).toBe(
        true,
      );
    }
  });
});
