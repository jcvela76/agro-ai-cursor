import { describe, expect, it } from "vitest";
import {
  AppendOrgTraceEvent,
  CreateOrgTraceLot,
} from "@/application/traceability/mutate-org-trace-lots";
import { evaluateEudrExportReadiness } from "@/domain/traceability/types";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineTraceLotRegistry } from "@/infrastructure/traceability/offline-trace-lot-registry";

describe("Trace-2/4: mutate org trace lots + EUDR", () => {
  const orgId = "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G";
  const entitled = defaultSyntheticSnapshots[6];

  it("denies create without entitlement", async () => {
    const registry = new OfflineTraceLotRegistry();
    const useCase = new CreateOrgTraceLot(registry, new SyntheticParcelRegistry());
    const result = await useCase.execute({
      authority: defaultSyntheticSnapshots[0],
      orgId,
      name: "Lote X",
      harvestSeason: "2026",
      producerName: "Prod",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("missing_traceability_entitlement");
    }
  });

  it("creates coffee lot with EUDR fields linked to org parcel", async () => {
    const registry = new OfflineTraceLotRegistry();
    const useCase = new CreateOrgTraceLot(registry, new SyntheticParcelRegistry());
    const result = await useCase.execute({
      authority: entitled,
      orgId,
      name: "Lote smoke C",
      harvestSeason: "2026",
      producerName: "Cooperativa Smoke",
      countryOfProduction: "pe",
      productionEndDate: "2026-07-01",
      deforestationFreeDeclared: true,
      parcelId: "parcel-lima-norte-001",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.lot.status).toBe("draft");
      expect(result.data.lot.cropType).toBe("coffee");
      expect(result.data.lot.countryOfProduction).toBe("PE");
      expect(result.data.lot.producerName).toBe("Cooperativa Smoke");
      expect(result.data.lot.productionEndDate).toBe("2026-07-01");
      expect(result.data.lot.deforestationFreeDeclared).toBe(true);
      expect(result.data.parcelLinks[0]?.parcelId).toBe("parcel-lima-norte-001");
      expect(JSON.stringify(result.data)).not.toContain("coordinates");
      expect(evaluateEudrExportReadiness(result.data).ok).toBe(true);
    }
  });

  it("rejects parcel from another org", async () => {
    const registry = new OfflineTraceLotRegistry();
    const useCase = new CreateOrgTraceLot(registry, new SyntheticParcelRegistry());
    const result = await useCase.execute({
      authority: entitled,
      orgId,
      name: "Lote bad",
      harvestSeason: "2026",
      producerName: "Prod",
      parcelId: "parcel-does-not-exist",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("cross_org_parcel");
    }
  });

  it("blocks exported when EUDR catalog incomplete", async () => {
    const registry = new OfflineTraceLotRegistry();
    const create = new CreateOrgTraceLot(registry, new SyntheticParcelRegistry());
    const append = new AppendOrgTraceEvent(registry);
    const created = await create.execute({
      authority: entitled,
      orgId,
      name: "Lote incomplete",
      harvestSeason: "2026",
      producerName: "Prod",
      deforestationFreeDeclared: false,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = await append.execute({
      authority: entitled,
      orgId,
      lotId: created.data.lot.id,
      eventType: "exported",
      occurredAt: "2026-08-01T12:00:00-05:00",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("eudr_incomplete");
    }
  });

  it("appends exported when EUDR catalog complete", async () => {
    const registry = new OfflineTraceLotRegistry();
    const create = new CreateOrgTraceLot(registry, new SyntheticParcelRegistry());
    const append = new AppendOrgTraceEvent(registry);
    const created = await create.execute({
      authority: entitled,
      orgId,
      name: "Lote export",
      harvestSeason: "2026",
      producerName: "Cooperativa Export",
      productionEndDate: "2026-07-15",
      deforestationFreeDeclared: true,
      parcelId: "parcel-lima-norte-001",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = await append.execute({
      authority: entitled,
      orgId,
      lotId: created.data.lot.id,
      eventType: "exported",
      occurredAt: "2026-08-01T12:00:00-05:00",
      evidenceRef: "synthetic://bill-of-lading",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.lot.status).toBe("exported");
      expect(result.data.events).toHaveLength(1);
      expect(result.data.events[0].actorId).toBe(entitled.userId);
      expect(result.data.events[0].evidenceRef).toBe("synthetic://bill-of-lading");
    }
  });

  it("hides not_found for foreign lotId", async () => {
    const registry = new OfflineTraceLotRegistry();
    const append = new AppendOrgTraceEvent(registry);
    const result = await append.execute({
      authority: entitled,
      orgId,
      lotId: "lot-lima-coffee-2026-a",
      eventType: "planted",
      occurredAt: "2026-01-01T12:00:00-05:00",
    });
    expect(result.ok).toBe(true);

    const foreign = await append.execute({
      authority: { ...entitled, orgId: "org-other" },
      orgId: "org-other",
      lotId: "lot-lima-coffee-2026-a",
      eventType: "harvested",
      occurredAt: "2026-02-01T12:00:00-05:00",
    });
    expect(foreign.ok).toBe(false);
    if (!foreign.ok) {
      expect(foreign.reason).toBe("not_found");
    }
  });

  it("rejects invalid eventType", async () => {
    const registry = new OfflineTraceLotRegistry();
    const append = new AppendOrgTraceEvent(registry);
    const result = await append.execute({
      authority: entitled,
      orgId,
      lotId: "lot-lima-coffee-2026-b",
      eventType: "shipped",
      occurredAt: "2026-03-01T12:00:00-05:00",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid_input");
    }
  });

  it("fixture lot A is EUDR-ready for export", () => {
    const registry = new OfflineTraceLotRegistry();
    return registry.getLotView("lot-lima-coffee-2026-a").then((view) => {
      expect(view).toBeDefined();
      expect(evaluateEudrExportReadiness(view!).ok).toBe(true);
    });
  });
});
