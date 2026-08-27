import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import { authorizeTraceabilityAccess } from "@/domain/auth/authorize-traceability-access";
import type { TraceLotRegistry, TraceLotView } from "@/domain/traceability/types";

export type ListOrgTraceLotsResult =
  | { ok: true; data: TraceLotView[] }
  | {
      ok: false;
      reason:
        | "unauthenticated"
        | "inactive_member"
        | "missing_traceability_entitlement"
        | "no_org";
      message: string;
    };

export class ListOrgTraceLots {
  constructor(private readonly lots: TraceLotRegistry) {}

  async execute(input: {
    authority: AccessSnapshot | null | undefined;
    orgId: string | null | undefined;
  }): Promise<ListOrgTraceLotsResult> {
    const access = authorizeTraceabilityAccess(input.authority);
    if (!access.ok) {
      return {
        ok: false,
        reason: access.reason,
        message: "Traceability data is not available for this request.",
      };
    }

    const orgId = input.orgId ?? input.authority!.orgId;
    if (!orgId || input.authority!.orgId !== orgId) {
      return {
        ok: false,
        reason: "no_org",
        message: "Traceability data is not available for this request.",
      };
    }

    const data = await this.lots.listLotsByOrg(orgId);
    return { ok: true, data };
  }
}
