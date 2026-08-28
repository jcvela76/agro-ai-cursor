import { normalizePlanSlug } from "@/domain/billing/plan-entitlements";

/**
 * Max org members (active + pending invites) per billing plan — pilot flat pricing, no per-seat.
 * Sync with docs/ops/billing.md.
 */
export const PLAN_MEMBER_LIMITS: Record<string, number> = {
  free: 2,
  free_org: 2,
  weather_base: 2,
  weather_plus: 5,
  operations: 15,
  full: 25,
};

/** Max generated reports per org per calendar month (America/Lima). ADR-035. */
export const PLAN_REPORT_LIMITS: Record<string, number> = {
  free: 0,
  free_org: 0,
  weather_base: 0,
  weather_plus: 10,
  operations: 30,
  full: 50,
};

const DEFAULT_MEMBER_LIMIT = PLAN_MEMBER_LIMITS.free;
const DEFAULT_REPORT_LIMIT = PLAN_REPORT_LIMITS.free;

export function reportLimitForPlan(slug: string | null | undefined): number {
  const normalized = normalizePlanSlug(slug) ?? "free";
  return PLAN_REPORT_LIMITS[normalized] ?? DEFAULT_REPORT_LIMIT;
}

export function reportQuotaUsage(input: {
  used: number;
  planSlug: string | null | undefined;
}): {
  limit: number;
  used: number;
  remaining: number;
  blocked: boolean;
} {
  const limit = reportLimitForPlan(input.planSlug);
  const used = input.used;
  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    blocked: used >= limit,
  };
}

/** YYYY-MM in America/Lima for monthly report quotas. */
export function currentBillingMonthKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

export function inferPlanSlugForQuota(input: {
  billingPlanSlug?: string | null;
  entitlements: string[];
}): string {
  const fromBilling = normalizePlanSlug(input.billingPlanSlug);
  if (fromBilling && fromBilling !== "free") {
    return fromBilling;
  }
  if (input.entitlements.includes("traceability") && input.entitlements.includes("agronomic_review")) {
    return "full";
  }
  if (input.entitlements.includes("traceability")) {
    return "operations";
  }
  if (input.entitlements.includes("weather_plus")) {
    return "weather_plus";
  }
  return fromBilling ?? "free";
}

export function memberLimitForPlan(slug: string | null | undefined): number {
  const normalized = normalizePlanSlug(slug) ?? "free";
  return PLAN_MEMBER_LIMITS[normalized] ?? DEFAULT_MEMBER_LIMIT;
}

export function memberSeatUsage(input: {
  activeMembers: number;
  pendingInvites: number;
  planSlug: string | null | undefined;
}): {
  limit: number;
  used: number;
  remaining: number;
  blocked: boolean;
} {
  const limit = memberLimitForPlan(input.planSlug);
  const used = input.activeMembers + input.pendingInvites;
  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    blocked: used >= limit,
  };
}
