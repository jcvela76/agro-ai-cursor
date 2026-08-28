import { describe, expect, it } from "vitest";
import { resolveOfflineFixtureParcelId } from "@/infrastructure/fixtures/resolve-offline-fixture-parcel-id";

describe("resolveOfflineFixtureParcelId", () => {
  it("maps prod dual-seed parcel ids to dev canonical fixtures", () => {
    expect(resolveOfflineFixtureParcelId("parcel-lima-norte-prod-001")).toBe(
      "parcel-lima-norte-001",
    );
  });

  it("leaves dev parcel ids unchanged", () => {
    expect(resolveOfflineFixtureParcelId("parcel-lima-norte-001")).toBe("parcel-lima-norte-001");
  });
});
