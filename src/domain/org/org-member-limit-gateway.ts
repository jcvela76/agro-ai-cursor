export interface OrgSeatSnapshot {
  activeMembers: number;
  pendingInvites: number;
  maxAllowedMemberships: number | null;
}

export interface OrgMemberLimitGateway {
  getSeatSnapshot(orgId: string): Promise<OrgSeatSnapshot>;
  setMaxAllowedMemberships(orgId: string, limit: number): Promise<void>;
  resolveRevokeActorUserId(orgId: string): Promise<string | null>;
  revokeInvitation(input: {
    organizationId: string;
    invitationId: string;
    requestingUserId: string;
  }): Promise<void>;
}
