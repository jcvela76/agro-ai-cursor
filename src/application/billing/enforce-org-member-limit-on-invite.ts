import { memberSeatUsage } from "@/domain/billing/plan-limits";
import type { OrgMemberLimitGateway } from "@/domain/org/org-member-limit-gateway";
import type { OrgMetadataStore } from "@/domain/workspace/types";

export class EnforceOrgMemberLimitOnInvite {
  constructor(
    private readonly metadata: OrgMetadataStore,
    private readonly members: OrgMemberLimitGateway,
  ) {}

  async execute(input: {
    orgId: string;
    invitationId: string;
    inviterUserId: string | null;
  }): Promise<{ revoked: boolean; reason?: "member_limit_exceeded" | "missing_revoker" }> {
    const settings = await this.metadata.getPublicMetadata(input.orgId);
    const snapshot = await this.members.getSeatSnapshot(input.orgId);
    const seats = memberSeatUsage({
      activeMembers: snapshot.activeMembers,
      pendingInvites: snapshot.pendingInvites,
      planSlug: settings.billingPlanSlug,
    });

    if (!seats.blocked) {
      return { revoked: false };
    }

    const requestingUserId =
      input.inviterUserId ?? (await this.members.resolveRevokeActorUserId(input.orgId));
    if (!requestingUserId) {
      console.error("Member limit exceeded but no revoker user for org", input.orgId);
      return { revoked: false, reason: "missing_revoker" };
    }

    await this.members.revokeInvitation({
      organizationId: input.orgId,
      invitationId: input.invitationId,
      requestingUserId,
    });

    return { revoked: true, reason: "member_limit_exceeded" };
  }
}
