/**
 * QA-7 smoke — billing entitlements, member limits, workspace settings (offline).
 *
 * Usage:
 *   npm run smoke:admin
 */
import { EnforceOrgMemberLimitOnInvite } from "../src/application/billing/enforce-org-member-limit-on-invite";
import { SyncOrgBillingEntitlements } from "../src/application/billing/sync-org-billing-entitlements";
import { SyncOrgMemberLimit } from "../src/application/billing/sync-org-member-limit";
import {
  GetWorkspaceSettings,
  UpdateWorkspaceSettings,
} from "../src/application/workspace/workspace-settings";
import { entitlementsFromPlanSlug } from "../src/domain/billing/plan-entitlements";
import { memberSeatUsage } from "../src/domain/billing/plan-limits";
import { MemoryOrgMetadataStore } from "../src/infrastructure/auth/clerk-org-metadata-store";
import { MemoryOrgMemberLimitGateway } from "../src/infrastructure/auth/clerk-org-member-limit-gateway";

const orgId = "org_smoke_admin_qa7";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(msg);
  }
}

async function main() {
  console.log("QA-7 admin/billing smoke");
  const steps: string[] = [];

  const operationsEntitlements = entitlementsFromPlanSlug("operations");
  assert(operationsEntitlements.includes("traceability"), "operations missing traceability");
  assert(operationsEntitlements.includes("agronomic_review"), "operations missing review");
  steps.push("plan map operations");

  const store = new MemoryOrgMetadataStore({
    [orgId]: {
      entitlements: ["weather"],
      authorizedParcelIds: ["parcel-lima-norte-001"],
      billingPlanSlug: "free",
    },
  });
  const members = new MemoryOrgMemberLimitGateway();

  const billing = new SyncOrgBillingEntitlements(store);
  const synced = await billing.execute({
    orgId,
    entitlements: ["weather", "weather_plus"],
    planSlug: "weather_plus",
  });
  assert(synced.billingPlanSlug === "weather_plus", "billing plan slug");
  assert(synced.authorizedParcelIds.includes("parcel-lima-norte-001"), "allowlist preserved");
  steps.push("billing sync");

  const limitSync = new SyncOrgMemberLimit(store, members);
  const limit = await limitSync.execute(orgId);
  assert(limit.limit === 5, "weather_plus seat limit");
  assert(members.maxLimits.get(orgId) === 5, "clerk max memberships");
  steps.push("member limit sync");

  members.snapshots.set(orgId, {
    activeMembers: 1,
    pendingInvites: 2,
    maxAllowedMemberships: 5,
  });
  const atCap = memberSeatUsage({
    activeMembers: 2,
    pendingInvites: 0,
    planSlug: "free_org",
  });
  assert(atCap.blocked, "free_org cap blocked");
  steps.push("seat usage cap");

  const capStore = new MemoryOrgMetadataStore({
    org_cap: {
      entitlements: ["weather"],
      authorizedParcelIds: [],
      billingPlanSlug: "free_org",
    },
  });
  const capMembers = new MemoryOrgMemberLimitGateway();
  capMembers.snapshots.set("org_cap", {
    activeMembers: 1,
    pendingInvites: 2,
    maxAllowedMemberships: 2,
  });
  const enforce = new EnforceOrgMemberLimitOnInvite(capStore, capMembers);
  const revoked = await enforce.execute({
    orgId: "org_cap",
    invitationId: "orginv_smoke",
    inviterUserId: "user_admin",
  });
  assert(revoked.revoked && revoked.reason === "member_limit_exceeded", "invite revoked at cap");
  steps.push("invite enforce");

  const getSettings = new GetWorkspaceSettings(store);
  const updateSettings = new UpdateWorkspaceSettings(store);
  const before = await getSettings.execute(orgId);
  assert(before.entitlements.includes("weather_plus"), "settings read");
  const updated = await updateSettings.execute({
    orgId,
    entitlements: ["weather", "weather_plus", "traceability"],
    authorizedParcelIds: ["parcel-lima-norte-001", "parcel-lima-norte-001"],
  });
  assert(updated.entitlements.includes("traceability"), "settings update entitlements");
  assert(updated.authorizedParcelIds.length === 1, "settings dedupe parcels");
  steps.push("workspace settings");

  console.log(`PASS [offline] ${steps.join(" → ")}`);
}

main().catch((error) => {
  console.error("FAIL", error);
  process.exit(1);
});
