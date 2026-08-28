import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requireOrgAdmin } from "@/lib/require-org-admin";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const gate = await requireOrgAdmin();
  if (!gate.ok) {
    return NextResponse.json({ status: "REMOVE_DENIED", message: gate.message }, { status: gate.status });
  }

  const { userId } = await context.params;
  if (!userId.startsWith("user_")) {
    return NextResponse.json({ status: "REMOVE_DENIED", message: "Invalid user id" }, { status: 400 });
  }
  if (userId === gate.userId) {
    return NextResponse.json(
      { status: "REMOVE_DENIED", message: "Cannot remove yourself from the organization" },
      { status: 400 },
    );
  }

  const client = await clerkClient();
  const memberships = await client.organizations.getOrganizationMembershipList({
    organizationId: gate.orgId,
    limit: 100,
  });
  const target = memberships.data.find((membership) => membership.publicUserData?.userId === userId);
  if (!target) {
    return NextResponse.json({ status: "REMOVE_DENIED", message: "Member not found" }, { status: 404 });
  }
  if (target.role === "org:admin") {
    const adminCount = memberships.data.filter((membership) => membership.role === "org:admin").length;
    if (adminCount <= 1) {
      return NextResponse.json(
        { status: "REMOVE_DENIED", message: "Cannot remove the only organization admin" },
        { status: 400 },
      );
    }
  }

  await client.organizations.deleteOrganizationMembership({
    organizationId: gate.orgId,
    userId,
  });

  return NextResponse.json({ status: "OK", data: { userId } });
}
