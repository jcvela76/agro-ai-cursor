import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest } from "next/server";
import {
  parseOrganizationCreatedEvent,
  parseOrganizationInvitationCreatedEvent,
} from "@/application/billing/parse-organization-invitation-event";
import { parseSubscriptionItemEvent } from "@/application/billing/parse-subscription-item-event";
import {
  enforceOrgMemberLimitOnInvite,
  syncOrgBillingEntitlements,
  syncOrgMemberLimit,
} from "@/infrastructure/container";

export async function POST(req: NextRequest) {
  let evt: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("Clerk webhook verification failed:", err);
    return new Response("Verification failed", { status: 400 });
  }

  const parsedBilling = parseSubscriptionItemEvent(evt.type, evt.data);
  if (parsedBilling) {
    try {
      await syncOrgBillingEntitlements.execute({
        orgId: parsedBilling.orgId,
        entitlements: parsedBilling.entitlements,
        planSlug: parsedBilling.planSlug,
      });
      await syncOrgMemberLimit.execute(parsedBilling.orgId);
    } catch (err) {
      console.error("Billing entitlement sync failed:", err);
      return new Response("Sync failed", { status: 500 });
    }
  }

  const parsedOrgCreated = parseOrganizationCreatedEvent(evt.type, evt.data);
  if (parsedOrgCreated) {
    try {
      await syncOrgMemberLimit.execute(parsedOrgCreated.orgId);
    } catch (err) {
      console.error("Org member limit sync failed:", err);
      return new Response("Member limit sync failed", { status: 500 });
    }
  }

  const parsedInvite = parseOrganizationInvitationCreatedEvent(evt.type, evt.data);
  if (parsedInvite) {
    try {
      const result = await enforceOrgMemberLimitOnInvite.execute({
        orgId: parsedInvite.orgId,
        invitationId: parsedInvite.invitationId,
        inviterUserId: parsedInvite.inviterUserId,
      });
      if (result.revoked) {
        console.info("Revoked org invitation over member limit", {
          orgId: parsedInvite.orgId,
          invitationId: parsedInvite.invitationId,
        });
      }
    } catch (err) {
      console.error("Member limit enforcement failed:", err);
      return new Response("Member limit enforcement failed", { status: 500 });
    }
  }

  return new Response("OK", { status: 200 });
}
