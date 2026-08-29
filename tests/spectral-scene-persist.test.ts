import { describe, expect, it } from "vitest";
import {
  buildSpectralSceneUpsert,
  formatSceneCapturedAt,
  isNewAcquisitionScene,
  persistSpectralScene,
} from "@/domain/spectral/persist-spectral-scene";
import type { SpectralSceneRecord } from "@/domain/spectral/scene-history";
import type { ParcelVegetationIndices } from "@/domain/spectral/types";
import { OfflineSpectralSceneRegistry } from "@/infrastructure/spectral/offline-spectral-scene-registry";

function sceneRecord(
  overrides: Partial<SpectralSceneRecord> & Pick<SpectralSceneRecord, "acquisitionDate" | "acquiredAt">,
): SpectralSceneRecord {
  return {
    id: "ss_test",
    orgId: "org_demo",
    parcelId: "parcel-1",
    sourceId: "offline",
    sourceLabel: "Offline",
    indices: [],
    evidence: {} as SpectralSceneRecord["evidence"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function vegetationIndices(
  overrides: Partial<ParcelVegetationIndices> = {},
): ParcelVegetationIndices {
  return {
    acquisitionDate: "2026-08-20",
    indices: [],
    evidence: {
      acquiredAt: "2026-08-20T10:30:00-05:00",
      sourceId: "offline",
      sourceLabel: "Offline",
      freshnessStatus: "fresh",
      freshnessPolicy: "14d",
      timezone: "America/Lima",
      spatialScope: { latitude: -12, longitude: -77, label: "parcel-1" },
    },
    ...overrides,
  } as ParcelVegetationIndices;
}

describe("spectral scene persist", () => {
  it("detects new acquisition by date, source, or acquiredAt", () => {
    const latest = sceneRecord({
      acquisitionDate: "2026-08-20",
      acquiredAt: "2026-08-20T10:30:00-05:00",
      sourceId: "offline",
    });

    expect(
      isNewAcquisitionScene(latest, {
        acquisitionDate: "2026-08-21",
        sourceId: "offline",
        acquiredAt: "2026-08-21T10:30:00-05:00",
      }),
    ).toBe(true);

    expect(
      isNewAcquisitionScene(latest, {
        acquisitionDate: "2026-08-20",
        sourceId: "sentinel-hub-cdse",
        acquiredAt: "2026-08-20T10:30:00-05:00",
      }),
    ).toBe(true);

    expect(
      isNewAcquisitionScene(latest, {
        acquisitionDate: "2026-08-20",
        sourceId: "offline",
        acquiredAt: "2026-08-20T11:00:00-05:00",
      }),
    ).toBe(true);

    expect(
      isNewAcquisitionScene(latest, {
        acquisitionDate: "2026-08-20",
        sourceId: "offline",
        acquiredAt: "2026-08-20T10:30:00-05:00",
      }),
    ).toBe(false);

    expect(
      isNewAcquisitionScene(null, {
        acquisitionDate: "2026-08-20",
        sourceId: "offline",
        acquiredAt: "2026-08-20T10:30:00-05:00",
      }),
    ).toBe(true);
  });

  it("skips upsert in new_scene_only when acquisition unchanged", async () => {
    const registry = new OfflineSpectralSceneRegistry();
    const input = buildSpectralSceneUpsert("org_demo", "parcel-1", vegetationIndices());

    const first = await persistSpectralScene(registry, input, "new_scene_only");
    expect(first.persisted).toBe(true);

    const second = await persistSpectralScene(registry, input, "new_scene_only");
    expect(second.persisted).toBe(false);
    expect(second.skippedReason).toBe("same_acquisition_scene");

    const listed = await registry.listByParcel({ orgId: "org_demo", parcelId: "parcel-1" });
    expect(listed).toHaveLength(1);
  });

  it("formats satellite capture time for display", () => {
    const formatted = formatSceneCapturedAt("2026-08-20T10:30:00-05:00", "America/Lima");
    expect(formatted).toMatch(/2026/);
    expect(formatted).not.toBe("2026-08-20T10:30:00-05:00");
  });
});
