import { describe, expect, it } from "vitest";
import { ListOrgParcels } from "@/application/parcel/list-org-parcels";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";

describe("ListOrgParcels", () => {
  const useCase = new ListOrgParcels(new SyntheticParcelRegistry());

  it("returns parcels for the active org only", async () => {
    const authority = defaultSyntheticSnapshots[0];
    const result = await useCase.execute({
      authority,
      orgId: authority.orgId,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((p) => p.orgId === authority.orgId)).toBe(true);
      expect(result.data.some((p) => p.id === "parcel-lima-norte-001")).toBe(true);
    }
  });

  it("denies unauthenticated callers", async () => {
    const result = await useCase.execute({ authority: null, orgId: null });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("unauthenticated");
    }
  });

  it("requires an active organization", async () => {
    const authority = {
      ...defaultSyntheticSnapshots[0],
      orgId: "",
    };
    const result = await useCase.execute({ authority, orgId: null });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("no_org");
    }
  });
});
