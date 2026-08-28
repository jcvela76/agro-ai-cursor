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

const DEFAULT_MEMBER_LIMIT = PLAN_MEMBER_LIMITS.free;

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
