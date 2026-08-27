import {
  normalizePlanSlug,
  resolveBillingEntitlements,
} from "@/domain/billing/plan-entitlements";
import type { ProductEntitlement } from "@/domain/auth/authorize-weather-access";

export type BillingSyncAction = "grant" | "revoke_to_free";

export interface ParsedSubscriptionItemEvent {
  orgId: string;
  planSlug: string | null;
  featureKeys: string[];
  entitlements: ProductEntitlement[];
  action: BillingSyncAction;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function extractOrgIdFromBillingData(data: unknown): string | null {
  const root = asRecord(data);
  if (!root) {
    return null;
  }
  const payer = asRecord(root.payer);
  const fromPayer = payer?.organization_id;
  if (typeof fromPayer === "string" && fromPayer.startsWith("org_")) {
    return fromPayer;
  }
  const top = root.organization_id;
  if (typeof top === "string" && top.startsWith("org_")) {
    return top;
  }
  return null;
}

export function extractPlanSlugFromBillingData(data: unknown): string | null {
  const root = asRecord(data);
  const plan = asRecord(root?.plan);
  const slug = plan?.slug;
  return typeof slug === "string" && slug.length > 0 ? slug : null;
}

export function extractFeatureKeysFromBillingData(data: unknown): string[] {
  const root = asRecord(data);
  const plan = asRecord(root?.plan);
  const features = plan?.features;
  if (!Array.isArray(features)) {
    return [];
  }
  const keys: string[] = [];
  for (const item of features) {
    if (typeof item === "string" && item.length > 0) {
      keys.push(item);
      continue;
    }
    const rec = asRecord(item);
    if (!rec) {
      continue;
    }
    if (typeof rec.slug === "string" && rec.slug.length > 0) {
      keys.push(rec.slug);
      continue;
    }
    if (typeof rec.key === "string" && rec.key.length > 0) {
      keys.push(rec.key);
    }
  }
  return keys;
}

export function parseSubscriptionItemEvent(
  type: string,
  data: unknown,
): ParsedSubscriptionItemEvent | null {
  const orgId = extractOrgIdFromBillingData(data);
  if (!orgId) {
    return null;
  }

  const planSlug = normalizePlanSlug(extractPlanSlugFromBillingData(data));
  const featureKeys = extractFeatureKeysFromBillingData(data).map((key) =>
    key.startsWith("org:") ? key.slice(4) : key,
  );

  if (type === "subscriptionItem.active" || type === "subscriptionItem.updated") {
    return {
      orgId,
      planSlug,
      featureKeys,
      entitlements: resolveBillingEntitlements({ featureKeys, planSlug }),
      action: "grant",
    };
  }

  if (
    type === "subscriptionItem.ended" ||
    type === "subscriptionItem.canceled" ||
    type === "subscriptionItem.expired" ||
    type === "subscriptionItem.abandoned"
  ) {
    return {
      orgId,
      planSlug: "free",
      featureKeys: [],
      entitlements: resolveBillingEntitlements({ featureKeys: [], planSlug: "free" }),
      action: "revoke_to_free",
    };
  }

  return null;
}
