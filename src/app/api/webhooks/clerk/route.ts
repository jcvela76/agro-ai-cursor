import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest } from "next/server";
import { parseSubscriptionItemEvent } from "@/application/billing/parse-subscription-item-event";
import { syncOrgBillingEntitlements } from "@/infrastructure/container";

export async function POST(req: NextRequest) {
  let evt: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("Clerk webhook verification failed:", err);
    return new Response("Verification failed", { status: 400 });
  }

  const parsed = parseSubscriptionItemEvent(evt.type, evt.data);
  if (parsed) {
    try {
      await syncOrgBillingEntitlements.execute({
        orgId: parsed.orgId,
        entitlements: parsed.entitlements,
        planSlug: parsed.planSlug,
      });
    } catch (err) {
      console.error("Billing entitlement sync failed:", err);
      return new Response("Sync failed", { status: 500 });
    }
  }

  return new Response("OK", { status: 200 });
}
