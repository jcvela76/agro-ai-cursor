import { describe, expect, it } from "vitest";
import { BuildReportContent } from "@/application/report/build-report-content";
import { CollectParcelSignals } from "@/application/report/collect-parcel-signals";
import { GetParcelSpectralZones } from "@/application/spectral/get-parcel-spectral-zones";
import { GetParcelVegetationIndices } from "@/application/spectral/get-parcel-vegetation-indices";
import { GetParcelWeatherEt0 } from "@/application/weather/get-parcel-et0";
import { GetParcelWeatherForecast, GetParcelWeatherObservation } from "@/application/weather/get-parcel-weather";
import { GetParcelWeatherGdd } from "@/application/weather/get-parcel-gdd";
import { GetParcelWeatherRainfall30d } from "@/application/weather/get-parcel-rainfall-30d";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";
import { OfflineTraceLotRegistry } from "@/infrastructure/traceability/offline-trace-lot-registry";
import { OfflineWeatherSource } from "@/infrastructure/weather/offline-weather-source";

const plus = defaultSyntheticSnapshots.find((s) => s.userId === "user-plus-005")!;
const parcels = new SyntheticParcelRegistry();
const weather = new OfflineWeatherSource();
const spectral = new OfflineSpectralSource();
const vegetation = new GetParcelVegetationIndices(parcels, spectral);
const zones = new GetParcelSpectralZones(parcels, spectral);

describe("Report-4 spectral zones in reports", () => {
  it("includes NDWI zone extremes in collected briefing signals", async () => {
    const collector = new CollectParcelSignals(
      parcels,
      new GetParcelWeatherObservation(parcels, weather),
      new GetParcelWeatherForecast(parcels, weather),
      new GetParcelWeatherRainfall30d(parcels, weather),
      new GetParcelWeatherEt0(parcels, weather),
      vegetation,
      zones,
    );
    const result = await collector.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
    });
    expect("ok" in result).toBe(false);
    if ("ok" in result) return;
    expect(result.signals.some((s) => s.id === "ndwi")).toBe(true);
    expect(result.signals.some((s) => s.id === "ndwi_zone_low")).toBe(true);
    expect(result.evidenceRows.some((r) => r.signal.includes("zona"))).toBe(true);
  });

  it("embeds zone bullets in water_balance HTML", async () => {
    const builder = new BuildReportContent(
      parcels,
      new OfflineTraceLotRegistry(),
      new GetParcelWeatherObservation(parcels, weather),
      new GetParcelWeatherForecast(parcels, weather),
      new GetParcelWeatherRainfall30d(parcels, weather),
      new GetParcelWeatherGdd(parcels, weather),
      new GetParcelWeatherEt0(parcels, weather),
      vegetation,
      zones,
    );
    const result = await builder.execute({
      reportType: "water_balance",
      authority: plus,
      parcelId: "parcel-lima-norte-001",
    });
    expect("ok" in result && result.ok === false).toBe(false);
    if ("ok" in result) return;
    expect(result.htmlContent).toMatch(/NDWI/);
    expect(result.htmlContent).toMatch(/zona|homogéneo|heterogene/i);
    expect(result.htmlContent).toContain("fishnet");
  });
});
