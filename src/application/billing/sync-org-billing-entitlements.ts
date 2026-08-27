import type { ProductEntitlement } from "@/domain/auth/authorize-weather-access";
import type { OrgMetadataStore, WorkspaceSettings } from "@/domain/workspace/types";

export class SyncOrgBillingEntitlements {
  constructor(private readonly store: OrgMetadataStore) {}

  async execute(input: {
    orgId: string;
    entitlements: ProductEntitlement[];
    planSlug: string | null;
  }): Promise<WorkspaceSettings> {
    const current = await this.store.getPublicMetadata(input.orgId);
    return this.store.setWorkspaceSettings(input.orgId, {
      entitlements: input.entitlements,
      authorizedParcelIds: current.authorizedParcelIds,
      billingPlanSlug: input.planSlug,
    });
  }
}
