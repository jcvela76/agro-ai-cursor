import { describe, expect, it } from "vitest";
import { ListOrgTraceLots } from "@/application/traceability/list-org-trace-lots";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { OfflineTraceLotRegistry } from "@/infrastructure/traceability/offline-trace-lot-registry";

describe("Trace-1: list org trace lots", () => {
  const registry = new OfflineTraceLotRegistry();
  const useCase = new ListOrgTraceLots(registry);
  const orgId = "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G";

  it("denies weather-only user", async () => {
    const result = await useCase.execute({
      authority: defaultSyntheticSnapshots[0],
      orgId,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("missing_traceability_entitlement");
    }
  });

  it("returns coffee fixtures for entitled org without geometry", async () => {
    const result = await useCase.execute({
      authority: defaultSyntheticSnapshots[6],
      orgId,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].lot.cropType).toBe("coffee");
      expect(result.data[0].events.length).toBeGreaterThan(0);
      expect(result.data[0].parcelLinks[0].parcelId).toBe("parcel-lima-norte-001");
      const serialized = JSON.stringify(result.data);
      expect(serialized).not.toContain("coordinates");
      expect(serialized).not.toContain("Polygon");
    }
  });

  it("returns empty for other org even with entitlement", async () => {
    const authority = {
      ...defaultSyntheticSnapshots[6],
      orgId: "org-other",
    };
    const result = await useCase.execute({
      authority,
      orgId: "org-other",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(0);
    }
  });
});
