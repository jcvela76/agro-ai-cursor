import {
  ALL_ENTITLEMENTS,
  normalizeEntitlements,
} from "@/domain/workspace/types";
import type { ProductEntitlement } from "@/domain/auth/authorize-weather-access";

/**
 * Clerk Billing Feature keys must match these IDs in the Dashboard
 * (Plans for Organizations → Features).
 */
export const BILLING_FEATURE_ENTITLEMENTS = ALL_ENTITLEMENTS;

/**
 * Fallback when a plan has no Feature list in the webhook payload.
 * Keep in sync with docs/ops/billing.md.
 */
export const PLAN_SLUG_ENTITLEMENTS: Record<string, ProductEntitlement[]> = {
  free: ["weather"],
  weather_base: ["weather"],
  weather_plus: ["weather", "weather_plus"],
  operations: ["weather", "weather_plus", "traceability", "agronomic_review"],
  full: ["weather", "weather_plus", "traceability", "agronomic_review"],
};

export function entitlementsFromFeatureKeys(keys: string[]): ProductEntitlement[] {
  return normalizeEntitlements(keys);
}

/** Clerk may emit `org:weather_plus` for Organization Plans; normalize to our map keys. */
export function normalizePlanSlug(slug: string | null | undefined): string | null {
  if (!slug) {
    return null;
  }
  const trimmed = slug.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  return trimmed.startsWith("org:") ? trimmed.slice(4) : trimmed;
}

export function entitlementsFromPlanSlug(slug: string | null | undefined): ProductEntitlement[] {
  const normalized = normalizePlanSlug(slug);
  if (!normalized) {
    return PLAN_SLUG_ENTITLEMENTS.free;
  }
  return PLAN_SLUG_ENTITLEMENTS[normalized] ?? PLAN_SLUG_ENTITLEMENTS.free;
}

export function resolveBillingEntitlements(input: {
  featureKeys: string[];
  planSlug: string | null;
}): ProductEntitlement[] {
  if (input.featureKeys.length > 0) {
    const fromFeatures = entitlementsFromFeatureKeys(input.featureKeys);
    if (fromFeatures.length > 0) {
      return fromFeatures;
    }
  }
  return entitlementsFromPlanSlug(input.planSlug);
}
