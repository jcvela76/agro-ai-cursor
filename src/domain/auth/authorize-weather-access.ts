export type ProductEntitlement =
  | "weather"
  | "weather_plus"
  | "traceability"
  | "agronomic_review";

export type WeatherAccessDenyReason =
  | "unauthenticated"
  | "inactive_member"
  | "missing_weather_entitlement"
  | "missing_parcel_access"
  | "cross_workspace_parcel";

export interface AccessSnapshot {
  userId: string;
  orgId: string;
  isActiveMember: boolean;
  entitlements: ProductEntitlement[];
  authorizedParcelIds: string[];
}

export interface WeatherAccessSnapshot extends AccessSnapshot {
  parcelId: string;
}

export type WeatherAccessResult =
  | { ok: true; snapshot: WeatherAccessSnapshot }
  | { ok: false; reason: WeatherAccessDenyReason; publicCode: "WEATHER_UNAVAILABLE" };

export const WEATHER_UNAVAILABLE = {
  status: "WEATHER_UNAVAILABLE" as const,
  message: "Weather data is not available for this request.",
};

export function authorizeWeatherAccess(
  authority: AccessSnapshot | null | undefined,
  parcelId: string,
  parcelOrgId: string,
): WeatherAccessResult {
  if (!authority || !authority.userId) {
    return {
      ok: false,
      reason: "unauthenticated",
      publicCode: "WEATHER_UNAVAILABLE",
    };
  }

  if (!authority.isActiveMember) {
    return {
      ok: false,
      reason: "inactive_member",
      publicCode: "WEATHER_UNAVAILABLE",
    };
  }

  if (!authority.entitlements.includes("weather")) {
    return {
      ok: false,
      reason: "missing_weather_entitlement",
      publicCode: "WEATHER_UNAVAILABLE",
    };
  }

  if (parcelOrgId !== authority.orgId) {
    return {
      ok: false,
      reason: "cross_workspace_parcel",
      publicCode: "WEATHER_UNAVAILABLE",
    };
  }

  // Empty allowlist = all parcels in the org (ADR-011). Non-empty = restrictive.
  if (
    authority.authorizedParcelIds.length > 0 &&
    !authority.authorizedParcelIds.includes(parcelId)
  ) {
    return {
      ok: false,
      reason: "missing_parcel_access",
      publicCode: "WEATHER_UNAVAILABLE",
    };
  }

  return {
    ok: true,
    snapshot: {
      ...authority,
      parcelId,
    },
  };
}

export function authorizeWeatherPlusAccess(
  authority: AccessSnapshot | null | undefined,
): boolean {
  return Boolean(
    authority?.isActiveMember &&
      authority.entitlements.includes("weather") &&
      authority.entitlements.includes("weather_plus"),
  );
}
