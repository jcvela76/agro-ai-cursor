import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { memberSeatUsage } from "@/domain/billing/plan-limits";
import { orgInvitationRedirectUrl } from "@/lib/app-url";
import { createOrgMetadataStore } from "@/infrastructure/container";
import { ClerkOrgMemberLimitGateway } from "@/infrastructure/auth/clerk-org-member-limit-gateway";

async function requireOrgAdmin() {
  const session = await auth();
  const { userId, orgId, has } = session;
  if (!userId || !orgId) {
    return { ok: false as const, status: 401, message: "Authentication and active organization required" };
  }
  if (!has({ role: "org:admin" })) {
    return { ok: false as const, status: 403, message: "Organization admin role required" };
  }
  return { ok: true as const, userId, orgId };
}

export async function POST(request: Request) {
  const gate = await requireOrgAdmin();
  if (!gate.ok) {
    return NextResponse.json({ status: "INVITE_DENIED", message: gate.message }, { status: gate.status });
  }

  let body: { emailAddress?: unknown; role?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ status: "INVITE_DENIED", message: "Invalid JSON body" }, { status: 400 });
  }

  const emailAddress = typeof body.emailAddress === "string" ? body.emailAddress.trim() : "";
  if (!emailAddress || !emailAddress.includes("@")) {
    return NextResponse.json({ status: "INVITE_DENIED", message: "Valid emailAddress required" }, { status: 400 });
  }

  const role = typeof body.role === "string" && body.role.startsWith("org:") ? body.role : "org:member";

  const metadata = createOrgMetadataStore();
  const members = new ClerkOrgMemberLimitGateway();
  const settings = await metadata.getPublicMetadata(gate.orgId);
  const snapshot = await members.getSeatSnapshot(gate.orgId);
  const seats = memberSeatUsage({
    activeMembers: snapshot.activeMembers,
    pendingInvites: snapshot.pendingInvites,
    planSlug: settings.billingPlanSlug,
  });

  if (seats.blocked) {
    return NextResponse.json(
      {
        status: "MEMBER_LIMIT_EXCEEDED",
        message: "Member limit reached for this plan",
        limit: seats.limit,
        used: seats.used,
      },
      { status: 403 },
    );
  }

  const client = await clerkClient();
  const invitation = await client.organizations.createOrganizationInvitation({
    organizationId: gate.orgId,
    inviterUserId: gate.userId,
    emailAddress,
    role,
    redirectUrl: orgInvitationRedirectUrl(),
  });

  return NextResponse.json({
    status: "OK",
    data: {
      id: invitation.id,
      emailAddress: invitation.emailAddress,
      redirectUrl: orgInvitationRedirectUrl(),
    },
  });
}
