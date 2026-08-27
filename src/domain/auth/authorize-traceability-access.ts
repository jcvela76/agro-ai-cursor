import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";

export type TraceAccessDenyReason =
  | "unauthenticated"
  | "inactive_member"
  | "missing_traceability_entitlement"
  | "no_org";

export type TraceAccessResult =
  | { ok: true }
  | { ok: false; reason: TraceAccessDenyReason; publicCode: "TRACE_UNAVAILABLE" };

export const TRACE_UNAVAILABLE = {
  status: "TRACE_UNAVAILABLE" as const,
  message: "Traceability data is not available for this request.",
};

/**
 * Gate for Traceability product. Org-scoped; no parcel allowlist in Trace-1.
 */
export function authorizeTraceabilityAccess(
  authority: AccessSnapshot | null | undefined,
): TraceAccessResult {
  if (!authority || !authority.userId) {
    return {
      ok: false,
      reason: "unauthenticated",
      publicCode: "TRACE_UNAVAILABLE",
    };
  }

  if (!authority.isActiveMember) {
    return {
      ok: false,
      reason: "inactive_member",
      publicCode: "TRACE_UNAVAILABLE",
    };
  }

  if (!authority.orgId) {
    return {
      ok: false,
      reason: "no_org",
      publicCode: "TRACE_UNAVAILABLE",
    };
  }

  if (!authority.entitlements.includes("traceability")) {
    return {
      ok: false,
      reason: "missing_traceability_entitlement",
      publicCode: "TRACE_UNAVAILABLE",
    };
  }

  return { ok: true };
}
