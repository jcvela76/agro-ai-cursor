import { describe, expect, it } from "vitest";
import {
  GetWorkspaceSettings,
  UpdateWorkspaceSettings,
} from "@/application/workspace/workspace-settings";
import { normalizeEntitlements } from "@/domain/workspace/types";
import { MemoryOrgMetadataStore } from "@/infrastructure/auth/clerk-org-metadata-store";

describe("normalizeEntitlements", () => {
  it("drops unknown values and implies weather when Plus is set", () => {
    expect(normalizeEntitlements(["weather_plus", "nope"])).toEqual([
      "weather",
      "weather_plus",
    ]);
  });
});

describe("Workspace settings use cases", () => {
  const orgId = "org_test";

  it("reads seeded settings", async () => {
    const store = new MemoryOrgMetadataStore({
      [orgId]: { entitlements: ["weather"], authorizedParcelIds: [] },
    });
    const result = await new GetWorkspaceSettings(store).execute(orgId);
    expect(result.entitlements).toEqual(["weather"]);
    expect(result.authorizedParcelIds).toEqual([]);
  });

  it("updates entitlements and allowlist", async () => {
    const store = new MemoryOrgMetadataStore({
      [orgId]: { entitlements: ["weather"], authorizedParcelIds: [] },
    });
    const updated = await new UpdateWorkspaceSettings(store).execute({
      orgId,
      entitlements: ["weather", "weather_plus"],
      authorizedParcelIds: ["parcel-a", "parcel-a", "parcel-b"],
    });
    expect(updated.entitlements).toEqual(["weather", "weather_plus"]);
    expect(updated.authorizedParcelIds).toEqual(["parcel-a", "parcel-b"]);

    const reread = await new GetWorkspaceSettings(store).execute(orgId);
    expect(reread).toEqual(updated);
  });
});
