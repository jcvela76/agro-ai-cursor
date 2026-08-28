import { describe, expect, it } from "vitest";
import { createReviewDecisionRegistry } from "@/infrastructure/container";
import { OfflineReviewDecisionRegistry } from "@/infrastructure/review/offline-review-registry";

describe("QA-6: review decision registry factory", () => {
  it("uses offline registry when DATABASE_URL is unset", () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const registry = createReviewDecisionRegistry();
      expect(registry).toBeInstanceOf(OfflineReviewDecisionRegistry);
    } finally {
      if (previous === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previous;
      }
    }
  });
});
