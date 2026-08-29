import { describe, expect, it } from "vitest";
import { BackfillParcelSpectralHistory } from "@/application/spectral/backfill-parcel-spectral-history";
import { GetParcelSpectralHistory } from "@/application/spectral/get-parcel-spectral-history";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineSpectralSceneRegistry } from "@/infrastructure/spectral/offline-spectral-scene-registry";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";

const plus = defaultSyntheticSnapshots.find((s) => s.userId === "user-plus-005")!;
const weatherOnly = defaultSyntheticSnapshots.find((s) => s.userId === "user-agronomist-001")!;

describe("Spectral-9 scene backfill", () => {
  it("persists multiple historical scenes from provider", async () => {
    const parcels = new SyntheticParcelRegistry();
    const scenes = new OfflineSpectralSceneRegistry();
    const backfill = new BackfillParcelSpectralHistory(
      parcels,
      new OfflineSpectralSource(),
      scenes,
    );
    const history = new GetParcelSpectralHistory(parcels, scenes);

    const result = await backfill.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      days: 30,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.kind).toBe("spectral_backfill");
    expect(result.data.scenesFound).toBeGreaterThanOrEqual(3);
    expect(result.data.acquisitionDates.length).toBe(result.data.scenesFound);

    const listed = await history.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      days: 90,
    });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.data.scenes.length).toBe(result.data.scenesFound);
  });

  it("is idempotent when backfill runs twice", async () => {
    const parcels = new SyntheticParcelRegistry();
    const scenes = new OfflineSpectralSceneRegistry();
    const backfill = new BackfillParcelSpectralHistory(
      parcels,
      new OfflineSpectralSource(),
      scenes,
    );

    await backfill.execute({ authority: plus, parcelId: "parcel-lima-norte-001", days: 30 });
    const second = await backfill.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      days: 30,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.data.scenesFound).toBeGreaterThanOrEqual(3);

    const rows = await scenes.listByParcel({
      orgId: plus.orgId,
      parcelId: "parcel-lima-norte-001",
    });
    expect(rows.length).toBe(second.data.scenesFound);
  });

  it("requires Plus entitlement", async () => {
    const backfill = new BackfillParcelSpectralHistory(
      new SyntheticParcelRegistry(),
      new OfflineSpectralSource(),
      new OfflineSpectralSceneRegistry(),
    );
    const result = await backfill.execute({
      authority: weatherOnly,
      parcelId: "parcel-lima-norte-001",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Plus");
    }
  });
});
