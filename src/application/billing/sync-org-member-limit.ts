import { memberLimitForPlan } from "@/domain/billing/plan-limits";
import type { OrgMemberLimitGateway } from "@/domain/org/org-member-limit-gateway";
import type { OrgMetadataStore } from "@/domain/workspace/types";

export class SyncOrgMemberLimit {
  constructor(
    private readonly metadata: OrgMetadataStore,
    private readonly members: OrgMemberLimitGateway,
  ) {}

  async execute(orgId: string): Promise<{ limit: number }> {
    const settings = await this.metadata.getPublicMetadata(orgId);
    const limit = memberLimitForPlan(settings.billingPlanSlug);
    await this.members.setMaxAllowedMemberships(orgId, limit);
    return { limit };
  }
}
