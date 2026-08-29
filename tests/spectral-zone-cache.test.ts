import { describe, expect, it } from "vitest";
import { GetParcelSpectralZones } from "@/application/spectral/get-parcel-spectral-zones";
import { buildSpectralZones } from "@/domain/spectral/build-spectral-zones";
import { partitionParcelZones } from "@/domain/spectral/partition-zones";
import type {
  SpectralIndexZonesPayload,
  SpectralIndexZonesRequest,
  SpectralLocationHint,
  SpectralResult,
  SpectralSource,
} from "@/domain/spectral/types";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";
import { OfflineSpectralZoneSnapshotRegistry } from "@/infrastructure/spectral/offline-spectral-zone-snapshot-registry";

const plus = defaultSyntheticSnapshots.find((s) => s.userId === "user-plus-005")!;

class CountingZoneSource implements SpectralSource {
  vegetationCalls = 0;
  zoneCalls = 0;
  private readonly offline = new OfflineSpectralSource();

  getVegetationIndices(parcelId: string, hint: SpectralLocationHint) {
    this.vegetationCalls += 1;
    return this.offline.getVegetationIndices(parcelId, hint);
  }

  async getIndexZones(
    input: SpectralIndexZonesRequest,
  ): Promise<SpectralResult<SpectralIndexZonesPayload>> {
    this.zoneCalls += 1;
    const cells = partitionParcelZones(input.geometry);
    const valuesByCellId = new Map<string, number | null>();
    for (const cell of cells) {
      valuesByCellId.set(cell.id, (input.parcelMean ?? 0.2) + 0.01);
    }
    return {
      ok: true,
      data: {
        indexId: input.indexId,
        zones: buildSpectralZones({ geometry: input.geometry, valuesByCellId }),
        parcelMean: input.parcelMean,
        computation: "process_raster",
      },
    };
  }
}

describe("Perf-3 spectral zone snapshots", () => {
  it("persists zones and serves cache on second call without getIndexZones", async () => {
    const source = new CountingZoneSource();
    const snapshots = new OfflineSpectralZoneSnapshotRegistry();
    const useCase = new GetParcelSpectralZones(
      new SyntheticParcelRegistry(),
      source,
      snapshots,
    );

    const first = await useCase.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      indexId: "ndre",
      acquiredAt: "2026-08-20T10:30:00-05:00",
      parcelMean: 0.28,
      sourceId: "offline-sentinel-2-synthetic",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.data.zones.length).toBeGreaterThanOrEqual(1);
    expect(first.data.evidence.freshnessPolicy).not.toContain("zones_cache_read");
    expect(source.zoneCalls).toBe(1);
    expect(source.vegetationCalls).toBe(0);

    const second = await useCase.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      indexId: "ndre",
      acquiredAt: "2026-08-20T10:30:00-05:00",
      parcelMean: 0.28,
      sourceId: "offline-sentinel-2-synthetic",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.data.evidence.freshnessPolicy).toContain("zones_cache_read");
    expect(second.data.zones.length).toBe(first.data.zones.length);
    expect(source.zoneCalls).toBe(1);
    expect(source.vegetationCalls).toBe(0);
  });

  it("also persists offline synthetic zones when getIndexZones is absent", async () => {
    const source = new OfflineSpectralSource();
    const snapshots = new OfflineSpectralZoneSnapshotRegistry();
    const useCase = new GetParcelSpectralZones(
      new SyntheticParcelRegistry(),
      source,
      snapshots,
    );

    const first = await useCase.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      indexId: "evi",
      acquiredAt: "2026-08-21T10:30:00-05:00",
      parcelMean: 0.35,
      sourceId: "offline-sentinel-2-synthetic",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.data.methodId).toContain("zones_synthetic");

    const second = await useCase.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      indexId: "evi",
      acquiredAt: "2026-08-21T10:30:00-05:00",
      parcelMean: 0.35,
      sourceId: "offline-sentinel-2-synthetic",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.data.evidence.freshnessPolicy).toContain("zones_cache_read");
  });

  it("refresh=1 bypasses cache and recomputes", async () => {
    const source = new CountingZoneSource();
    const snapshots = new OfflineSpectralZoneSnapshotRegistry();
    const useCase = new GetParcelSpectralZones(
      new SyntheticParcelRegistry(),
      source,
      snapshots,
    );

    await useCase.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      indexId: "ndwi",
      acquiredAt: "2026-08-20T10:30:00-05:00",
      parcelMean: 0.1,
      sourceId: "offline-sentinel-2-synthetic",
    });
    expect(source.zoneCalls).toBe(1);

    const refreshed = await useCase.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      indexId: "ndwi",
      acquiredAt: "2026-08-20T10:30:00-05:00",
      parcelMean: 0.1,
      sourceId: "offline-sentinel-2-synthetic",
      refresh: true,
    });
    expect(refreshed.ok).toBe(true);
    if (!refreshed.ok) return;
    expect(refreshed.data.evidence.freshnessPolicy).not.toContain("zones_cache_read");
    expect(source.zoneCalls).toBe(2);
    expect(source.vegetationCalls).toBe(0);
  });
});
