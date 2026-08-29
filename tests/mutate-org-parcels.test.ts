import { describe, expect, it } from "vitest";
import { CreateOrgParcel, DeleteOrgParcel, UpdateOrgParcel } from "@/application/parcel/mutate-org-parcels";
import { demoParcelSquare, squareAround } from "@/domain/parcel/geometry";
import { polygonCentroid } from "@/domain/parcel/geometry";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";

describe("parcel geometry centroid", () => {
  it("computes centroid inside a square", () => {
    const poly = squareAround(-77.05, -11.95, 0.01);
    const c = polygonCentroid(poly);
    expect(c.longitude).toBeCloseTo(-77.05, 5);
    expect(c.latitude).toBeCloseTo(-11.95, 5);
  });
});

describe("CreateOrgParcel / UpdateOrgParcel / DeleteOrgParcel", () => {
  const authority = defaultSyntheticSnapshots[0];

  it("creates a parcel for the active org", async () => {
    const registry = new SyntheticParcelRegistry([]);
    const create = new CreateOrgParcel(registry);
    const geometry = demoParcelSquare(-77.1, -12.0);

    const result = await create.execute({
      authority,
      orgId: authority.orgId,
      name: "Nueva parcela",
      geometry,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.orgId).toBe(authority.orgId);
      expect(result.data.name).toBe("Nueva parcela");
      expect(result.data.geometry?.type).toBe("Polygon");
      expect(result.data.longitude).toBeCloseTo(-77.1, 4);
    }
  });

  it("rejects unauthenticated create", async () => {
    const create = new CreateOrgParcel(new SyntheticParcelRegistry([]));
    const result = await create.execute({
      authority: null,
      orgId: null,
      name: "X",
      geometry: demoParcelSquare(0, 0),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("unauthenticated");
    }
  });

  it("updates and deletes within org", async () => {
    const registry = new SyntheticParcelRegistry([]);
    const create = new CreateOrgParcel(registry);
    const update = new UpdateOrgParcel(registry);
    const del = new DeleteOrgParcel(registry);

    const created = await create.execute({
      authority,
      orgId: authority.orgId,
      name: "Temp",
      geometry: demoParcelSquare(-77.0, -12.0),
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const updated = await update.execute({
      authority,
      orgId: authority.orgId,
      parcelId: created.data.id,
      name: "Temp renombrada",
    });
    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.data.name).toBe("Temp renombrada");
    }

    const deleted = await del.execute({
      authority,
      orgId: authority.orgId,
      parcelId: created.data.id,
    });
    expect(deleted.ok).toBe(true);
    expect(await registry.getParcel(created.data.id)).toBeUndefined();
  });

  it("hides cross-org update as not_found", async () => {
    const registry = new SyntheticParcelRegistry();
    const update = new UpdateOrgParcel(registry);
    const result = await update.execute({
      authority,
      orgId: authority.orgId,
      parcelId: "parcel-cusco-valle-002",
      name: "Hack",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_found");
    }
  });
});
