import type { ProductEntitlement } from "@/domain/auth/authorize-weather-access";

export interface WorkspaceSettings {
  entitlements: ProductEntitlement[];
  authorizedParcelIds: string[];
}

export interface OrgMetadataStore {
  getPublicMetadata(orgId: string): Promise<WorkspaceSettings>;
  /** Replaces entitlements and authorizedParcelIds in public metadata. */
  setWorkspaceSettings(orgId: string, settings: WorkspaceSettings): Promise<WorkspaceSettings>;
}

export const ALL_ENTITLEMENTS: ProductEntitlement[] = [
  "weather",
  "weather_plus",
  "traceability",
];

export function normalizeEntitlements(raw: unknown): ProductEntitlement[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const set = new Set<ProductEntitlement>();
  for (const item of raw) {
    if (item === "weather" || item === "weather_plus" || item === "traceability") {
      set.add(item);
    }
  }
  // Plus implies weather base
  if (set.has("weather_plus")) {
    set.add("weather");
  }
  return ALL_ENTITLEMENTS.filter((e) => set.has(e));
}

export function normalizeParcelIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return [...new Set(raw.filter((item): item is string => typeof item === "string" && item.length > 0))];
}
