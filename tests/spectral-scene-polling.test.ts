import { describe, expect, it } from "vitest";
import { RunSpectralScenePolling } from "@/application/spectral/run-spectral-scene-polling";
import { MemoryOrgMetadataStore } from "@/infrastructure/auth/clerk-org-metadata-store";
import { OfflineDailyBriefingDeliveryPrefsRegistry } from "@/infrastructure/report/offline-daily-briefing-delivery-prefs";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineSpectralSceneRegistry } from "@/infrastructure/spectral/offline-spectral-scene-registry";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";

const ORG_PLUS = "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G";

describe("Spectral-8 scene polling cron", () => {
  it("persists only on first new scene per parcel", async () => {
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
    const polling = new RunSpectralScenePolling(
      parcels,
      new OfflineSpectralSource(),
      scenes,
      metadata,
      prefs,
      () => parcels.listOrgIds(),
    );

    const first = await polling.execute();
    const org = first.results.find((item) => item.orgId === ORG_PLUS);
    expect(org).toBeDefined();
    const parcel = org?.parcels.find((item) => item.parcelId === "parcel-lima-norte-001");
    expect(parcel?.persisted).toBe(true);
    expect(parcel?.acquisitionDate).toBe("2026-08-20");
    expect(parcel?.acquiredAt).toBe("2026-08-20T10:30:00-05:00");

    const second = await polling.execute();
    const org2 = second.results.find((item) => item.orgId === ORG_PLUS);
    const parcel2 = org2?.parcels.find((item) => item.parcelId === "parcel-lima-norte-001");
    expect(parcel2?.persisted).toBe(false);
    expect(parcel2?.skippedReason).toBe("same_acquisition_scene");

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

    const polling = new RunSpectralScenePolling(
      new SyntheticParcelRegistry(),
      new OfflineSpectralSource(),
      new OfflineSpectralSceneRegistry(),
      metadata,
      prefs,
    );

    const result = await polling.execute();
    const org = result.results.find((item) => item.orgId === "org_weather_only");
    expect(org?.parcels[0]?.skippedReason).toBe("missing_plus_entitlement");
  });
});
