import { describe, expect, it } from "vitest";
import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import {
  capabilityForSideTab,
  isSideTabEntitled,
  resolveWorkspaceCapabilities,
  upsellKeyForSideTab,
} from "@/domain/auth/workspace-capabilities";

function snap(entitlements: AccessSnapshot["entitlements"]): AccessSnapshot {
  return {
    userId: "user_1",
    orgId: "org_1",
    isActiveMember: true,
    entitlements,
    authorizedParcelIds: [],
  };
}

describe("resolveWorkspaceCapabilities", () => {
  it("maps free_org weather-only", () => {
    const caps = resolveWorkspaceCapabilities(snap(["weather"]), false);
    expect(caps).toEqual({
      weather: true,
      weatherPlus: false,
      traceability: false,
      agronomicReview: false,
      isAdmin: false,
    });
  });

  it("maps Plus + products", () => {
    const caps = resolveWorkspaceCapabilities(
      snap(["weather", "weather_plus", "traceability", "agronomic_review"]),
      true,
    );
    expect(caps.weatherPlus).toBe(true);
    expect(caps.traceability).toBe(true);
    expect(caps.agronomicReview).toBe(true);
    expect(caps.isAdmin).toBe(true);
  });

  it("denies inactive members", () => {
    const caps = resolveWorkspaceCapabilities(
      { ...snap(["weather", "weather_plus"]), isActiveMember: false },
      false,
    );
    expect(caps.weather).toBe(false);
    expect(caps.weatherPlus).toBe(false);
  });
});

describe("side-tab gating", () => {
  const free = resolveWorkspaceCapabilities(snap(["weather"]), false);

  it("entitles only weather on Free", () => {
    expect(isSideTabEntitled("weather", free)).toBe(true);
    expect(isSideTabEntitled("spectral", free)).toBe(false);
    expect(isSideTabEntitled("agent", free)).toBe(false);
    expect(isSideTabEntitled("profile", free)).toBe(false);
    expect(isSideTabEntitled("field", free)).toBe(false);
    expect(isSideTabEntitled("trace", free)).toBe(false);
    expect(isSideTabEntitled("review", free)).toBe(false);
  });

  it("maps tabs to capability flags", () => {
    expect(capabilityForSideTab("spectral")).toBe("weatherPlus");
    expect(capabilityForSideTab("trace")).toBe("traceability");
    expect(capabilityForSideTab("review")).toBe("agronomicReview");
    expect(upsellKeyForSideTab("agent")).toBe("agent");
  });
});
