import { normalizePlanSlug } from "@/domain/billing/plan-entitlements";

/** Human-readable plan names for billing UI (sync with docs/ops/clerk-billing-plans.json). */
export const BILLING_PLAN_LABELS: Record<string, string> = {
  free_org: "Weather Intelligence (base)",
  free: "Weather Intelligence (base)",
  weather_base: "Weather Intelligence (base)",
  weather_plus: "Weather Intelligence Plus",
  operations: "Operations Intelligence",
  full: "Full Intelligence",
};

const BILLING_PLAN_PRICES_USD: Record<string, number> = {
  weather_plus: 29,
  operations: 79,
  full: 99,
};

export function planDisplayLabel(slug: string | null | undefined): string {
  const normalized = normalizePlanSlug(slug);
  if (!normalized) {
    return BILLING_PLAN_LABELS.free;
  }
  return BILLING_PLAN_LABELS[normalized] ?? normalized;
}

export function planDisplayPrice(slug: string | null | undefined): string | null {
  const normalized = normalizePlanSlug(slug);
  if (!normalized) {
    return null;
  }
  const amount = BILLING_PLAN_PRICES_USD[normalized];
  return amount != null ? `$${amount}/mes` : null;
}

/** True on localhost, stg, or Vercel preview — Clerk Billing sandbox context. */
export function isBillingSandboxHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "stg.geoagro.ai" ||
    host.endsWith(".vercel.app")
  );
}
