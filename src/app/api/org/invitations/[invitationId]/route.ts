import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requireOrgAdmin } from "@/lib/require-org-admin";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ invitationId: string }> },
) {
  const gate = await requireOrgAdmin();
  if (!gate.ok) {
    return NextResponse.json({ status: "REVOKE_DENIED", message: gate.message }, { status: gate.status });
  }

  const { invitationId } = await context.params;
  if (!invitationId.startsWith("orginv_")) {
    return NextResponse.json({ status: "REVOKE_DENIED", message: "Invalid invitation id" }, { status: 400 });
  }

  const client = await clerkClient();
  await client.organizations.revokeOrganizationInvitation({
    organizationId: gate.orgId,
    invitationId,
    requestingUserId: gate.userId,
  });

  return NextResponse.json({ status: "OK", data: { id: invitationId } });
}
