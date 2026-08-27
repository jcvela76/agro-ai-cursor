import { describe, expect, it } from "vitest";
import { authorizeTraceabilityAccess } from "@/domain/auth/authorize-traceability-access";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";

describe("authorizeTraceabilityAccess", () => {
  it("denies without entitlement", () => {
    const result = authorizeTraceabilityAccess(defaultSyntheticSnapshots[0]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("missing_traceability_entitlement");
    }
  });

  it("allows active member with traceability", () => {
    const result = authorizeTraceabilityAccess(defaultSyntheticSnapshots[6]);
    expect(result.ok).toBe(true);
  });

  it("denies unauthenticated", () => {
    const result = authorizeTraceabilityAccess(null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("unauthenticated");
    }
  });
});
