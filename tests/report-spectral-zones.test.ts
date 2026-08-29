import { describe, expect, it, vi } from "vitest";
import { BuildReportContent } from "@/application/report/build-report-content";
import { CollectParcelSignals } from "@/application/report/collect-parcel-signals";
import { GetParcelSpectralZones } from "@/application/spectral/get-parcel-spectral-zones";
import { GetParcelVegetationIndices } from "@/application/spectral/get-parcel-vegetation-indices";
import { GetParcelWeatherEt0 } from "@/application/weather/get-parcel-et0";
import { GetParcelWeatherForecast, GetParcelWeatherObservation } from "@/application/weather/get-parcel-weather";
import { GetParcelWeatherGdd } from "@/application/weather/get-parcel-gdd";
import { GetParcelWeatherRainfall30d } from "@/application/weather/get-parcel-rainfall-30d";
import { buildSpectralZones } from "@/domain/spectral/build-spectral-zones";
import { partitionParcelZones } from "@/domain/spectral/partition-zones";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineSpectralSceneRegistry } from "@/infrastructure/spectral/offline-spectral-scene-registry";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";
import { OfflineSpectralZoneSnapshotRegistry } from "@/infrastructure/spectral/offline-spectral-zone-snapshot-registry";
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

  it("prefers Neon scene + zone snapshot without calling the spectral provider", async () => {
    const parcel = await parcels.getParcel("parcel-lima-norte-001");
    expect(parcel?.geometry).toBeTruthy();
    if (!parcel?.geometry) return;

    const scenes = new OfflineSpectralSceneRegistry();
    const zoneSnaps = new OfflineSpectralZoneSnapshotRegistry();
    const source = new OfflineSpectralSource();
    const vegSpy = vi.spyOn(source, "getVegetationIndices");

    const idx = await source.getVegetationIndices(parcel.id, {
      latitude: parcel.latitude,
      longitude: parcel.longitude,
      geometry: parcel.geometry,
      timezone: parcel.timezone,
    });
    expect(idx.ok).toBe(true);
    if (!idx.ok) return;

    await scenes.upsert({
      orgId: parcel.orgId,
      parcelId: parcel.id,
      acquisitionDate: idx.data.acquisitionDate,
      acquiredAt: idx.data.evidence.acquiredAt,
      sourceId: idx.data.evidence.sourceId,
      sourceLabel: idx.data.evidence.sourceLabel,
      indices: idx.data.indices.map((item) => ({ id: item.id, value: item.value })),
      evidence: idx.data.evidence,
    });

    const cells = partitionParcelZones(parcel.geometry);
    const valuesByCellId = new Map<string, number | null>();
    for (const [i, cell] of cells.entries()) {
      valuesByCellId.set(cell.id, 0.1 + i * 0.05);
    }
    const built = buildSpectralZones({
      geometry: parcel.geometry,
      valuesByCellId,
    });
    const ndwiMean = idx.data.indices.find((i) => i.id === "ndwi")?.value ?? null;
    await zoneSnaps.upsert({
      orgId: parcel.orgId,
      parcelId: parcel.id,
      acquisitionDate: idx.data.acquisitionDate,
      acquiredAt: idx.data.evidence.acquiredAt,
      sourceId: idx.data.evidence.sourceId,
      indexId: "ndwi",
      parcelMean: ndwiMean,
      methodId: "ndwi+zones_cached/v1",
      zones: built,
      evidence: idx.data.evidence,
    });

    vegSpy.mockClear();

    const vegetationCached = new GetParcelVegetationIndices(parcels, source, scenes);
    const zonesCached = new GetParcelSpectralZones(parcels, source, zoneSnaps);
    const builder = new BuildReportContent(
      parcels,
      new OfflineTraceLotRegistry(),
      new GetParcelWeatherObservation(parcels, weather),
      new GetParcelWeatherForecast(parcels, weather),
      new GetParcelWeatherRainfall30d(parcels, weather),
      new GetParcelWeatherGdd(parcels, weather),
      new GetParcelWeatherEt0(parcels, weather),
      vegetationCached,
      zonesCached,
    );

    const result = await builder.execute({
      reportType: "water_balance",
      authority: plus,
      parcelId: parcel.id,
    });
    expect("ok" in result && result.ok === false).toBe(false);
    if ("ok" in result) return;
    expect(result.htmlContent).toContain("snapshot guardado");
    expect(vegSpy).not.toHaveBeenCalled();
  });
});
