import {
  authorizeAgronomicReviewAccess,
} from "@/domain/auth/authorize-review-access";
import {
  authorizeTraceabilityAccess,
} from "@/domain/auth/authorize-traceability-access";
import {
  authorizeWeatherPlusAccess,
  type AccessSnapshot,
} from "@/domain/auth/authorize-weather-access";

/** Parcel side-tabs in `/app` (must stay aligned with AppShell). */
export type WorkspaceSideTab =
  | "weather"
  | "spectral"
  | "agent"
  | "profile"
  | "field"
  | "trace"
  | "review";

export type WorkspaceCapabilities = {
  weather: boolean;
  weatherPlus: boolean;
  traceability: boolean;
  agronomicReview: boolean;
  isAdmin: boolean;
};

export const DEFAULT_WORKSPACE_CAPABILITIES: WorkspaceCapabilities = {
  weather: false,
  weatherPlus: false,
  traceability: false,
  agronomicReview: false,
  isAdmin: false,
};

export function resolveWorkspaceCapabilities(
  authority: AccessSnapshot | null | undefined,
  isAdmin: boolean,
): WorkspaceCapabilities {
  const weather = Boolean(
    authority?.isActiveMember && authority.entitlements.includes("weather"),
  );
  return {
    weather,
    weatherPlus: authorizeWeatherPlusAccess(authority),
    traceability: authorizeTraceabilityAccess(authority).ok,
    agronomicReview: authorizeAgronomicReviewAccess(authority).ok,
    isAdmin,
  };
}

/** Which capability unlocks a parcel side-tab. `weather` is always the Free path. */
export function capabilityForSideTab(
  tab: WorkspaceSideTab,
): keyof Pick<
  WorkspaceCapabilities,
  "weather" | "weatherPlus" | "traceability" | "agronomicReview"
> {
  switch (tab) {
    case "weather":
      return "weather";
    case "spectral":
    case "agent":
    case "profile":
    case "field":
      return "weatherPlus";
    case "trace":
      return "traceability";
    case "review":
      return "agronomicReview";
  }
}

export function isSideTabEntitled(
  tab: WorkspaceSideTab,
  capabilities: WorkspaceCapabilities,
): boolean {
  return capabilities[capabilityForSideTab(tab)];
}

/** Upsell feature key for locked tabs / panels (ADR-060 Free → Enterprise). */
export type PlanFeatureUpsellKey =
  | "spectral"
  | "agent"
  | "profile"
  | "field"
  | "trace"
  | "review"
  | "reports"
  | "briefings";

export function upsellKeyForSideTab(
  tab: Exclude<WorkspaceSideTab, "weather">,
): PlanFeatureUpsellKey {
  return tab;
}
