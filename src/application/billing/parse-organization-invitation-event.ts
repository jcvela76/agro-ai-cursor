function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export interface ParsedOrganizationInvitationCreated {
  orgId: string;
  invitationId: string;
  inviterUserId: string | null;
}

export function parseOrganizationInvitationCreatedEvent(
  type: string,
  data: unknown,
): ParsedOrganizationInvitationCreated | null {
  if (type !== "organizationInvitation.created") {
    return null;
  }

  const root = asRecord(data);
  if (!root) {
    return null;
  }

  const invitationId = root.id;
  if (typeof invitationId !== "string" || invitationId.length === 0) {
    return null;
  }

  const orgFromField = root.organization_id;
  const orgFromObject = asRecord(root.organization)?.id;
  const orgId =
    typeof orgFromField === "string" && orgFromField.startsWith("org_")
      ? orgFromField
      : typeof orgFromObject === "string" && orgFromObject.startsWith("org_")
        ? orgFromObject
        : null;
  if (!orgId) {
    return null;
  }

  const inviter =
    root.inviter_user_id ??
    asRecord(root.public_user_data)?.user_id ??
    asRecord(root.inviter)?.user_id;

  return {
    orgId,
    invitationId,
    inviterUserId: typeof inviter === "string" && inviter.startsWith("user_") ? inviter : null,
  };
}

export function parseOrganizationCreatedEvent(
  type: string,
  data: unknown,
): { orgId: string } | null {
  if (type !== "organization.created") {
    return null;
  }
  const root = asRecord(data);
  const orgId = root?.id;
  if (typeof orgId !== "string" || !orgId.startsWith("org_")) {
    return null;
  }
  return { orgId };
}
