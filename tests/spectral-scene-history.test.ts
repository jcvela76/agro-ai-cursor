import { describe, expect, it } from "vitest";
import { GetParcelSpectralHistory } from "@/application/spectral/get-parcel-spectral-history";
import { GetParcelVegetationIndices } from "@/application/spectral/get-parcel-vegetation-indices";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineSpectralSceneRegistry } from "@/infrastructure/spectral/offline-spectral-scene-registry";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";

const plus = defaultSyntheticSnapshots.find((s) => s.userId === "user-plus-005")!;
const weatherOnly = defaultSyntheticSnapshots.find((s) => s.userId === "user-agronomist-001")!;

describe("Spectral-7 scene history", () => {
  it("upserts scene when indices are fetched and lists history", async () => {
    const parcels = new SyntheticParcelRegistry();
    const scenes = new OfflineSpectralSceneRegistry();
    const indices = new GetParcelVegetationIndices(parcels, new OfflineSpectralSource(), scenes);
    const history = new GetParcelSpectralHistory(parcels, scenes);

    const before = await history.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      days: 90,
    });
    expect(before.ok).toBe(true);
    if (!before.ok) return;
    expect(before.data.scenes).toHaveLength(0);

    const idx = await indices.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
    });
    expect(idx.ok).toBe(true);

    const after = await history.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      days: 90,
    });
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.data.kind).toBe("spectral_history");
    expect(after.data.scenes).toHaveLength(1);
    expect(after.data.scenes[0]?.indices.length).toBe(8);
    expect(after.data.scenes[0]?.acquisitionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("is idempotent for the same acquisition day", async () => {
    const parcels = new SyntheticParcelRegistry();
    const scenes = new OfflineSpectralSceneRegistry();
    const indices = new GetParcelVegetationIndices(parcels, new OfflineSpectralSource(), scenes);
    const history = new GetParcelSpectralHistory(parcels, scenes);

    await indices.execute({ authority: plus, parcelId: "parcel-lima-norte-001" });
    await indices.execute({ authority: plus, parcelId: "parcel-lima-norte-001" });

    const listed = await history.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
    });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.data.scenes).toHaveLength(1);
  });

  it("requires Plus for history", async () => {
    const history = new GetParcelSpectralHistory(
      new SyntheticParcelRegistry(),
      new OfflineSpectralSceneRegistry(),
    );
    const result = await history.execute({
      authority: weatherOnly,
      parcelId: "parcel-lima-norte-001",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Plus");
    }
  });
});
