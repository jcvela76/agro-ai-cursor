import { describe, expect, it } from "vitest";
import {
  GetParcelAgronomicProfile,
  UpdateParcelAgronomicProfile,
} from "@/application/parcel/parcel-agronomic-profile";
import { parseProfileFields } from "@/domain/parcel/agronomic-profile";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineParcelAgronomicProfileRegistry } from "@/infrastructure/parcel/offline-parcel-agronomic-profile-registry";

describe("parseProfileFields", () => {
  it("keeps only known fields and trims", () => {
    expect(
      parseProfileFields({
        crop: "  café ",
        unknown: "x",
        irrigationFrequency: "",
      }),
    ).toEqual({
      crop: "Café",
      cropKey: "cafe",
      irrigationFrequency: null,
    });
  });
});

describe("parcel agronomic profile use cases", () => {
  const parcels = new SyntheticParcelRegistry();
  const profiles = new OfflineParcelAgronomicProfileRegistry();
  const get = new GetParcelAgronomicProfile(parcels, profiles);
  const update = new UpdateParcelAgronomicProfile(parcels, profiles);
  const plus = defaultSyntheticSnapshots.find((s) => s.userId === "user-plus-005")!;
  const weatherOnly = defaultSyntheticSnapshots.find(
    (s) => s.userId === "user-agronomist-001",
  )!;
  const crossOrg = defaultSyntheticSnapshots.find((s) => s.userId === "user-cross-ws-004")!;

  it("denies without Plus", async () => {
    const result = await get.execute({
      authority: weatherOnly,
      parcelId: "parcel-lima-norte-001",
    });
    expect(result.ok).toBe(false);
  });

  it("returns empty profile when none saved", async () => {
    const result = await get.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.crop).toBeNull();
    expect(result.data.parcelId).toBe("parcel-lima-norte-001");
  });

  it("updates partially and merges", async () => {
    const saved = await update.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      fields: { crop: "café", irrigationFrequency: "cada 3 días" },
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.data.crop).toBe("café");
    expect(saved.data.irrigationFrequency).toBe("cada 3 días");

    const merged = await update.execute({
      authority: plus,
      parcelId: "parcel-lima-norte-001",
      fields: { sowingDate: "2026-03-01" },
    });
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.data.crop).toBe("café");
    expect(merged.data.sowingDate).toBe("2026-03-01");
  });

  it("blocks cross-org parcel", async () => {
    const result = await get.execute({
      authority: crossOrg,
      parcelId: "parcel-lima-norte-001",
    });
    expect(result.ok).toBe(false);
  });
});
