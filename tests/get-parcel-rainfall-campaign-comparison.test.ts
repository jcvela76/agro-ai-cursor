import { describe, expect, it } from "vitest";
import { GetParcelWeatherRainfallCampaignComparison } from "@/application/weather/get-parcel-rainfall-campaign-comparison";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineWeatherSource } from "@/infrastructure/weather/offline-weather-source";

describe("WQ-12: campaign rainfall comparison (Plus)", () => {
  const registry = new SyntheticParcelRegistry();
  const source = new OfflineWeatherSource();
  const useCase = new GetParcelWeatherRainfallCampaignComparison(registry, source);

  it("denies without weather_plus entitlement", async () => {
    const result = await useCase.execute({
      authority: defaultSyntheticSnapshots[0],
      parcelId: "parcel-lima-norte-001",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Plus");
    }
  });

  it("returns versioned comparison with evidence for Plus user", async () => {
    const result = await useCase.execute({
      authority: defaultSyntheticSnapshots[4],
      parcelId: "parcel-lima-norte-001",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.kind).toBe("rainfall_campaign_comparison");
      expect(result.data.comparisonMethodId).toBe(
        "campaign-vs-prior-year-calendar-ytd/v1",
      );
      expect(result.data.campaign.totalPrecipitationMm).toBe(45.2);
      expect(result.data.reference.totalPrecipitationMm).toBe(38.7);
      expect(result.data.deltaMm).toBe(6.5);
      expect(result.data.deltaPercent).toBe(16.8);
      expect(result.data.evidence.sourceId).toBeTruthy();
    }
  });
});
