import type { OrgMetadataStore } from "@/domain/workspace/types";
import { SyncOrgBillingEntitlements } from "@/application/billing/sync-org-billing-entitlements";
import { normalizePlanSlug } from "@/domain/billing/plan-entitlements";

const PAID_PLAN_SLUGS = new Set(["weather_plus", "operations", "full"]);

export type EnsureFreeOrgResult = "applied" | "skipped";

/**
 * Idempotent Free bootstrap for new orgs (ADR-061).
 * Skips if the org already has a paid plan slug or paid entitlements.
 */
export class EnsureFreeOrgOnCreate {
  constructor(
    private readonly store: OrgMetadataStore,
    private readonly syncBilling: SyncOrgBillingEntitlements,
  ) {}

  async execute(orgId: string): Promise<EnsureFreeOrgResult> {
    const current = await this.store.getPublicMetadata(orgId);
    const slug = normalizePlanSlug(current.billingPlanSlug) ?? "";

    if (PAID_PLAN_SLUGS.has(slug)) {
      return "skipped";
    }

    const hasPaidEntitlement = current.entitlements.some(
      (e) => e === "weather_plus" || e === "traceability" || e === "agronomic_review",
    );
    if (hasPaidEntitlement) {
      return "skipped";
    }

    const alreadyFree =
      (slug === "" || slug === "free" || slug === "free_org") &&
      current.entitlements.length === 1 &&
      current.entitlements[0] === "weather";

    if (alreadyFree) {
      return "skipped";
    }

    if (slug && slug !== "free" && slug !== "free_org") {
      return "skipped";
    }

    await this.syncBilling.execute({
      orgId,
      entitlements: ["weather"],
      planSlug: "free_org",
    });
    return "applied";
  }
}
