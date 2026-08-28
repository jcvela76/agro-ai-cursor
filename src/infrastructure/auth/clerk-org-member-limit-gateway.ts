import { clerkClient } from "@clerk/nextjs/server";
import type {
  OrgMemberLimitGateway,
  OrgSeatSnapshot,
} from "@/domain/org/org-member-limit-gateway";

export class ClerkOrgMemberLimitGateway implements OrgMemberLimitGateway {
  async getSeatSnapshot(orgId: string): Promise<OrgSeatSnapshot> {
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    const invitations = await client.organizations.getOrganizationInvitationList({
      organizationId: orgId,
      status: ["pending"],
      limit: 1,
    });

    return {
      activeMembers: org.membersCount ?? 0,
      pendingInvites: invitations.totalCount,
      maxAllowedMemberships: org.maxAllowedMemberships ?? null,
    };
  }

  async setMaxAllowedMemberships(orgId: string, limit: number): Promise<void> {
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    if (org.maxAllowedMemberships === limit) {
      return;
    }
    await client.organizations.updateOrganization(orgId, {
      maxAllowedMemberships: limit,
    });
  }

  async resolveRevokeActorUserId(orgId: string): Promise<string | null> {
    const client = await clerkClient();
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 50,
    });
    const admin = memberships.data.find((member) => member.role === "org:admin");
    const userId = admin?.publicUserData?.userId;
    return typeof userId === "string" && userId.startsWith("user_") ? userId : null;
  }

  async revokeInvitation(input: {
    organizationId: string;
    invitationId: string;
    requestingUserId: string;
  }): Promise<void> {
    const client = await clerkClient();
    await client.organizations.revokeOrganizationInvitation({
      organizationId: input.organizationId,
      invitationId: input.invitationId,
      requestingUserId: input.requestingUserId,
    });
  }
}

/** In-memory gateway for tests. */
export class MemoryOrgMemberLimitGateway implements OrgMemberLimitGateway {
  readonly snapshots = new Map<string, OrgSeatSnapshot>();
  readonly maxLimits = new Map<string, number>();
  readonly revoked: Array<{
    organizationId: string;
    invitationId: string;
    requestingUserId: string;
  }> = [];
  revokeActorUserId: string | null = "user_test_admin";

  async getSeatSnapshot(orgId: string): Promise<OrgSeatSnapshot> {
    return (
      this.snapshots.get(orgId) ?? {
        activeMembers: 0,
        pendingInvites: 0,
        maxAllowedMemberships: null,
      }
    );
  }

  async setMaxAllowedMemberships(orgId: string, limit: number): Promise<void> {
    this.maxLimits.set(orgId, limit);
    const current = await this.getSeatSnapshot(orgId);
    this.snapshots.set(orgId, { ...current, maxAllowedMemberships: limit });
  }

  async resolveRevokeActorUserId(orgId: string): Promise<string | null> {
    void orgId;
    return this.revokeActorUserId;
  }

  async revokeInvitation(input: {
    organizationId: string;
    invitationId: string;
    requestingUserId: string;
  }): Promise<void> {
    this.revoked.push(input);
  }
}
