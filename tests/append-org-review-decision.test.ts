import { describe, expect, it } from "vitest";
import { AppendOrgReviewDecision } from "@/application/review/append-org-review-decision";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineReviewDecisionRegistry } from "@/infrastructure/review/offline-review-registry";

describe("Review-1: append org review decision", () => {
  const orgId = "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G";
  const entitled = defaultSyntheticSnapshots[7];

  it("denies without entitlement", async () => {
    const useCase = new AppendOrgReviewDecision(
      new OfflineReviewDecisionRegistry(),
      new SyntheticParcelRegistry(),
    );
    const result = await useCase.execute({
      authority: defaultSyntheticSnapshots[0],
      orgId,
      parcelId: "parcel-lima-norte-001",
      kind: "observe",
      summary: "x",
      rationale: "y",
      actorId: "user-1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("missing_agronomic_review_entitlement");
    }
  });

  it("appends decide linked to org parcel", async () => {
    const registry = new OfflineReviewDecisionRegistry();
    const useCase = new AppendOrgReviewDecision(
      registry,
      new SyntheticParcelRegistry(),
    );
    const result = await useCase.execute({
      authority: entitled,
      orgId,
      parcelId: "parcel-lima-norte-001",
      kind: "decide",
      summary: "Mantener muestreo semanal",
      rationale: "Floración irregular aún no estabiliza; evidencia de nota de campo.",
      actorId: "user-review-008",
      evidenceRef: "field-note-smoke",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.kind).toBe("decide");
      expect(result.data.parcelId).toBe("parcel-lima-norte-001");
      expect(result.data.evidenceRef).toBe("field-note-smoke");
      expect(result.data.id.startsWith("rev-")).toBe(true);
    }

    const listed = await registry.listDecisionsByOrg(orgId);
    expect(listed.some((d) => d.summary === "Mantener muestreo semanal")).toBe(
      true,
    );
  });

  it("rejects unknown kind and cross-org parcel", async () => {
    const useCase = new AppendOrgReviewDecision(
      new OfflineReviewDecisionRegistry(),
      new SyntheticParcelRegistry(),
    );
    const badKind = await useCase.execute({
      authority: entitled,
      orgId,
      parcelId: "parcel-lima-norte-001",
      kind: "approve",
      summary: "x",
      rationale: "y",
      actorId: "user-1",
    });
    expect(badKind.ok).toBe(false);
    if (!badKind.ok) {
      expect(badKind.reason).toBe("invalid_input");
    }

    const badParcel = await useCase.execute({
      authority: entitled,
      orgId,
      parcelId: "parcel-does-not-exist",
      kind: "observe",
      summary: "x",
      rationale: "y",
      actorId: "user-1",
    });
    expect(badParcel.ok).toBe(false);
    if (!badParcel.ok) {
      expect(badParcel.reason).toBe("cross_org_parcel");
    }
  });
});
