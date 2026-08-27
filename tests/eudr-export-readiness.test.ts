import { describe, expect, it } from "vitest";
import {
  evaluateEudrExportReadiness,
  type TraceLotView,
} from "@/domain/traceability/types";

function baseView(overrides: Partial<TraceLotView["lot"]> = {}, links = 1): TraceLotView {
  return {
    lot: {
      id: "lot-x",
      orgId: "org-x",
      name: "Lote",
      cropType: "coffee",
      harvestSeason: "2026",
      status: "draft",
      countryOfProduction: "PE",
      producerName: "Prod",
      productionEndDate: "2026-06-01",
      deforestationFreeDeclared: true,
      ...overrides,
    },
    events: [],
    parcelLinks:
      links > 0
        ? [{ parcelId: "parcel-1", lotId: "lot-x", linkedAt: "2026-01-01T00:00:00Z" }]
        : [],
  };
}

describe("evaluateEudrExportReadiness", () => {
  it("passes complete catalog", () => {
    expect(evaluateEudrExportReadiness(baseView()).ok).toBe(true);
  });

  it("reports missing fields", () => {
    const result = evaluateEudrExportReadiness(
      baseView(
        {
          producerName: " ",
          countryOfProduction: "peru",
          productionEndDate: undefined,
          deforestationFreeDeclared: false,
        },
        0,
      ),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toEqual([
        "producerName",
        "countryOfProduction",
        "productionEndDate",
        "deforestationFreeDeclared",
        "parcelLink",
      ]);
    }
  });
});
