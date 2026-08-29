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

/** Max daily briefings per org per calendar month (America/Lima). ADR-036. */
export const PLAN_DAILY_BRIEFING_LIMITS: Record<string, number> = {
  free: 0,
  free_org: 0,
  weather_base: 0,
  weather_plus: 20,
  operations: 60,
  full: 120,
};

/**
 * Agro Agent chat retention window (days) for the shared parcel thread.
 * Unlimited deferred. ADR-049.
 */
export const PLAN_AGENT_CHAT_RETENTION_DAYS: Record<string, number> = {
  free: 0,
  free_org: 0,
  weather_base: 0,
  weather_plus: 7,
  operations: 30,
  full: 90,
};

/** Secondary cap when loading chat history within the retention window. */
export const AGENT_CHAT_LOAD_MAX_MESSAGES = 80;

/** Max parcels per org (create blocked at limit). Pilot mid. */
export const PLAN_PARCEL_COUNT_LIMITS: Record<string, number> = {
  free: 2,
  free_org: 2,
  weather_base: 2,
  weather_plus: 10,
  operations: 40,
  full: 100,
};

/** Max hectares per parcel polygon (create / expand). Pilot mid. */
export const PLAN_PARCEL_MAX_HA: Record<string, number> = {
  free: 25,
  free_org: 25,
  weather_base: 25,
  weather_plus: 100,
  operations: 500,
  full: 2000,
};

const DEFAULT_MEMBER_LIMIT = PLAN_MEMBER_LIMITS.free;
const DEFAULT_REPORT_LIMIT = PLAN_REPORT_LIMITS.free;
const DEFAULT_DAILY_BRIEFING_LIMIT = PLAN_DAILY_BRIEFING_LIMITS.free;
const DEFAULT_AGENT_CHAT_RETENTION_DAYS = PLAN_AGENT_CHAT_RETENTION_DAYS.free;
const DEFAULT_PARCEL_COUNT_LIMIT = PLAN_PARCEL_COUNT_LIMITS.free;
const DEFAULT_PARCEL_MAX_HA = PLAN_PARCEL_MAX_HA.free;

export function reportLimitForPlan(slug: string | null | undefined): number {
  const normalized = normalizePlanSlug(slug) ?? "free";
  return PLAN_REPORT_LIMITS[normalized] ?? DEFAULT_REPORT_LIMIT;
}

export function dailyBriefingLimitForPlan(slug: string | null | undefined): number {
  const normalized = normalizePlanSlug(slug) ?? "free";
  return PLAN_DAILY_BRIEFING_LIMITS[normalized] ?? DEFAULT_DAILY_BRIEFING_LIMIT;
}

export function agentChatRetentionDaysForPlan(slug: string | null | undefined): number {
  const normalized = normalizePlanSlug(slug) ?? "free";
  return PLAN_AGENT_CHAT_RETENTION_DAYS[normalized] ?? DEFAULT_AGENT_CHAT_RETENTION_DAYS;
}

export function parcelCountLimitForPlan(slug: string | null | undefined): number {
  const normalized = normalizePlanSlug(slug) ?? "free";
  return PLAN_PARCEL_COUNT_LIMITS[normalized] ?? DEFAULT_PARCEL_COUNT_LIMIT;
}

export function parcelMaxHaForPlan(slug: string | null | undefined): number {
  const normalized = normalizePlanSlug(slug) ?? "free";
  return PLAN_PARCEL_MAX_HA[normalized] ?? DEFAULT_PARCEL_MAX_HA;
}

export function parcelQuotaUsage(input: {
  used: number;
  planSlug: string | null | undefined;
}): {
  limit: number;
  used: number;
  remaining: number;
  blocked: boolean;
  maxHaPerParcel: number;
} {
  const limit = parcelCountLimitForPlan(input.planSlug);
  const used = input.used;
  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    blocked: used >= limit,
    maxHaPerParcel: parcelMaxHaForPlan(input.planSlug),
  };
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

export function dailyBriefingQuotaUsage(input: {
  used: number;
  planSlug: string | null | undefined;
}): {
  limit: number;
  used: number;
  remaining: number;
  blocked: boolean;
} {
  const limit = dailyBriefingLimitForPlan(input.planSlug);
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

/** YYYY-MM-DD in America/Lima for daily briefing cadence. */
export function currentReportDayKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
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
