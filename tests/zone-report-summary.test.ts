import { describe, expect, it } from "vitest";
import { synthesizeDailyBriefingDeterministic } from "@/application/report/synthesize-daily-briefing";
import type { ParcelSpectralZones } from "@/domain/spectral/types";
import {
  pickZoneExtremes,
  zoneExtremesBullet,
  zoneExtremesBriefingSignals,
  zoneExtremesEvidenceRows,
} from "@/domain/spectral/zone-report-summary";

function zonesFixture(values: number[]): ParcelSpectralZones {
  const labels = ["SO", "S", "SE", "O", "centro", "E", "NO", "N", "NE"];
  return {
    kind: "spectral_zones",
    indexId: "ndwi",
    label: "NDWI",
    parcelMean: values.reduce((a, b) => a + b, 0) / values.length,
    methodId: "test+zones/v1",
    evidence: {
      sourceId: "test",
      sourceLabel: "Test source",
      acquiredAt: "2026-08-08T00:00:00Z",
      timezone: "America/Lima",
      spatialScope: {
        kind: "point",
        latitude: -11.95,
        longitude: -77.05,
        label: "test",
      },
      freshnessStatus: "fresh",
      freshnessPolicy: "test",
    },
    zones: values.map((value, i) => ({
      id: `z${i}`,
      label: labels[i] ?? `Z${i}`,
      tier: "mid" as const,
      value,
      areaShare: 1 / values.length,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-77.05, -11.95],
            [-77.04, -11.95],
            [-77.04, -11.94],
            [-77.05, -11.94],
            [-77.05, -11.95],
          ],
        ],
      },
      centroid: { longitude: -77.045, latitude: -11.945 },
    })),
  };
}

describe("zone-report-summary", () => {
  it("picks low/high extremes and spread", () => {
    const extremes = pickZoneExtremes(zonesFixture([-0.2, 0.0, 0.15]));
    expect(extremes.low?.value).toBe(-0.2);
    expect(extremes.high?.value).toBe(0.15);
    expect(extremes.spread).toBeCloseTo(0.35);
    expect(extremes.homogeneous).toBe(false);
    expect(zoneExtremesBullet(extremes)).toContain("más bajo");
    expect(zoneExtremesEvidenceRows(extremes, "src", "2026-08-08")).toHaveLength(3);
    expect(zoneExtremesBriefingSignals(extremes, "src", "2026-08-08").map((s) => s.id)).toEqual([
      "ndwi_zone_low",
      "ndwi_zone_high",
      "ndwi_zone_spread",
    ]);
  });

  it("marks near-flat zones as homogeneous", () => {
    const extremes = pickZoneExtremes(zonesFixture([0.1, 0.12, 0.11]));
    expect(extremes.homogeneous).toBe(true);
    expect(zoneExtremesBullet(extremes)).toContain("homogéneo");
  });
});

describe("synthesizeDailyBriefingDeterministic zones", () => {
  it("suggests inspection when NDWI zone spread is high", () => {
    const { suggestions } = synthesizeDailyBriefingDeterministic({
      signals: [
        {
          id: "ndwi",
          label: "NDWI",
          value: -0.05,
          source: "test",
          validity: "2026-08-08",
        },
        {
          id: "ndwi_zone_low",
          label: "NDWI zona baja (NO)",
          value: -0.18,
          source: "test",
          validity: "2026-08-08",
        },
        {
          id: "ndwi_zone_spread",
          label: "NDWI heterogeneidad (Δ)",
          value: 0.22,
          source: "test",
          validity: "2026-08-08",
        },
      ],
    });
    const zoneHint = suggestions.find((s) => s.evidenceRefs.includes("ndwi_zone_spread"));
    expect(zoneHint).toBeTruthy();
    expect(zoneHint?.text).toContain("Heterogeneidad NDWI");
    expect(zoneHint?.text).toContain("NO");
  });
});
