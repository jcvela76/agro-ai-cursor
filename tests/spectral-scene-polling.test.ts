import { describe, expect, it, vi } from "vitest";
import { GetParcelSpectralZones } from "@/application/spectral/get-parcel-spectral-zones";
import { RunSpectralScenePolling } from "@/application/spectral/run-spectral-scene-polling";
import { VEGETATION_INDEX_ORDER } from "@/domain/spectral/vegetation-indices";
import { MemoryOrgMetadataStore } from "@/infrastructure/auth/clerk-org-metadata-store";
import { OfflineDailyBriefingDeliveryPrefsRegistry } from "@/infrastructure/report/offline-daily-briefing-delivery-prefs";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineSpectralSceneRegistry } from "@/infrastructure/spectral/offline-spectral-scene-registry";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";
import { OfflineSpectralZoneSnapshotRegistry } from "@/infrastructure/spectral/offline-spectral-zone-snapshot-registry";

const ORG_PLUS = "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G";

function makeZones(parcels: SyntheticParcelRegistry, source = new OfflineSpectralSource()) {
  return new GetParcelSpectralZones(
    parcels,
    source,
    new OfflineSpectralZoneSnapshotRegistry(),
  );
}

describe("Spectral-8 scene polling cron", () => {
  it("persists only on first new scene per parcel and precomputes zones (Perf-5)", async () => {
    const prefs = new OfflineDailyBriefingDeliveryPrefsRegistry();
    await prefs.upsert({
      orgId: ORG_PLUS,
      enabled: true,
      channels: ["email"],
      emailRecipients: ["ops@example.com"],
      parcelIds: ["parcel-lima-norte-001"],
    });

    const metadata = new MemoryOrgMetadataStore({
      [ORG_PLUS]: {
        entitlements: ["weather", "weather_plus"],
        authorizedParcelIds: [],
        billingPlanSlug: "weather_plus",
      },
    });

    const parcels = new SyntheticParcelRegistry();
    const scenes = new OfflineSpectralSceneRegistry();
    const zoneSnapshots = new OfflineSpectralZoneSnapshotRegistry();
    const zones = new GetParcelSpectralZones(parcels, new OfflineSpectralSource(), zoneSnapshots);
    const zonesSpy = vi.spyOn(zones, "execute");

    const polling = new RunSpectralScenePolling(
      parcels,
      new OfflineSpectralSource(),
      scenes,
      metadata,
      prefs,
      zones,
      () => parcels.listOrgIds(),
    );

    const first = await polling.execute();
    const org = first.results.find((item) => item.orgId === ORG_PLUS);
    expect(org).toBeDefined();
    const parcel = org?.parcels.find((item) => item.parcelId === "parcel-lima-norte-001");
    expect(parcel?.persisted).toBe(true);
    expect(parcel?.acquisitionDate).toBe("2026-08-20");
    expect(parcel?.acquiredAt).toBe("2026-08-20T10:30:00-05:00");
    expect(parcel?.zonesPrecomputed).toBe(VEGETATION_INDEX_ORDER.length);
    expect(zonesSpy).toHaveBeenCalledTimes(VEGETATION_INDEX_ORDER.length);

    for (const indexId of VEGETATION_INDEX_ORDER) {
      const snap = await zoneSnapshots.getBySceneKey({
        orgId: ORG_PLUS,
        parcelId: "parcel-lima-norte-001",
        acquisitionDate: "2026-08-20",
        sourceId: "offline-sentinel-2-synthetic",
        indexId,
      });
      expect(snap).not.toBeNull();
      expect(snap?.zones.length).toBeGreaterThanOrEqual(1);
    }

    zonesSpy.mockClear();
    const second = await polling.execute();
    const org2 = second.results.find((item) => item.orgId === ORG_PLUS);
    const parcel2 = org2?.parcels.find((item) => item.parcelId === "parcel-lima-norte-001");
    expect(parcel2?.persisted).toBe(false);
    expect(parcel2?.skippedReason).toBe("same_acquisition_scene");
    expect(parcel2?.zonesPrecomputed).toBeUndefined();
    expect(zonesSpy).not.toHaveBeenCalled();

    const listed = await scenes.listByParcel({
      orgId: ORG_PLUS,
      parcelId: "parcel-lima-norte-001",
    });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.acquiredAt).toBe("2026-08-20T10:30:00-05:00");
  });

  it("skips orgs without weather_plus", async () => {
    const prefs = new OfflineDailyBriefingDeliveryPrefsRegistry();
    await prefs.upsert({
      orgId: "org_weather_only",
      enabled: true,
      channels: ["email"],
      emailRecipients: ["ops@example.com"],
      parcelIds: [],
    });

    const metadata = new MemoryOrgMetadataStore({
      org_weather_only: {
        entitlements: ["weather"],
        authorizedParcelIds: [],
        billingPlanSlug: "weather",
      },
    });

    const parcels = new SyntheticParcelRegistry();
    const polling = new RunSpectralScenePolling(
      parcels,
      new OfflineSpectralSource(),
      new OfflineSpectralSceneRegistry(),
      metadata,
      prefs,
      makeZones(parcels),
    );

    const result = await polling.execute();
    const org = result.results.find((item) => item.orgId === "org_weather_only");
    expect(org?.parcels[0]?.skippedReason).toBe("missing_plus_entitlement");
  });
});
