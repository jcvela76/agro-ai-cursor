/**
 * Smoke Free self-serve bootstrap (ADR-061).
 *
 * Offline (default): EnsureFreeOrgOnCreate + member limit against memory stores.
 *
 * Live Clerk (Development):
 *   SMOKE_CLERK=1 npm run smoke:free-selfserve
 *   Creates throwaway user+org, applies Free via use case (or waits for webhook).
 *
 * Wait for real webhook (stg/local endpoint must be subscribed):
 *   SMOKE_CLERK=1 SMOKE_FREE_WAIT_WEBHOOK=1 npm run smoke:free-selfserve
 *
 * Cleanup: deletes smoke org (+ user if created). Set SMOKE_FREE_KEEP=1 to retain.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { EnsureFreeOrgOnCreate } from "../src/application/billing/ensure-free-org-on-create";
import { SyncOrgBillingEntitlements } from "../src/application/billing/sync-org-billing-entitlements";
import { SyncOrgMemberLimit } from "../src/application/billing/sync-org-member-limit";
import type { OrgMemberLimitGateway } from "../src/domain/org/org-member-limit-gateway";
import {
  normalizeEntitlements,
  normalizeParcelIds,
  type OrgMetadataStore,
  type WorkspaceSettings,
} from "../src/domain/workspace/types";
import { MemoryOrgMetadataStore } from "../src/infrastructure/auth/clerk-org-metadata-store";
import { MemoryOrgMemberLimitGateway } from "../src/infrastructure/auth/clerk-org-member-limit-gateway";

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const CLERK_API = "https://api.clerk.com/v1";
const stamp = Date.now();

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(msg);
  }
}

function readWorkspaceSettings(metadata: Record<string, unknown>): WorkspaceSettings {
  const slug = metadata.billingPlanSlug;
  return {
    entitlements: normalizeEntitlements(metadata.entitlements),
    authorizedParcelIds: normalizeParcelIds(metadata.authorizedParcelIds),
    billingPlanSlug: typeof slug === "string" ? slug : slug === null ? null : undefined,
  };
}

/** Minimal Clerk OrgMetadataStore via Backend REST (no Next runtime). */
class FetchClerkOrgMetadataStore implements OrgMetadataStore {
  constructor(private readonly secret: string) {}

  private async org(orgId: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${CLERK_API}/organizations/${orgId}`, {
      headers: { Authorization: `Bearer ${this.secret}` },
    });
    assert(res.ok, `getOrganization ${orgId}: HTTP ${res.status}`);
    return (await res.json()) as Record<string, unknown>;
  }

  async getPublicMetadata(orgId: string): Promise<WorkspaceSettings> {
    const o = await this.org(orgId);
    return readWorkspaceSettings((o.public_metadata as Record<string, unknown>) ?? {});
  }

  async setWorkspaceSettings(orgId: string, settings: WorkspaceSettings): Promise<WorkspaceSettings> {
    const current = await this.org(orgId);
    const existing = { ...((current.public_metadata as Record<string, unknown>) ?? {}) };
    const res = await fetch(`${CLERK_API}/organizations/${orgId}/metadata`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${this.secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        public_metadata: {
          ...existing,
          entitlements: settings.entitlements,
          authorizedParcelIds: settings.authorizedParcelIds,
          billingPlanSlug: settings.billingPlanSlug ?? existing.billingPlanSlug ?? null,
        },
      }),
    });
    const body = await res.text();
    assert(res.ok, `patch metadata ${orgId}: HTTP ${res.status} ${body}`);
    const o = JSON.parse(body) as Record<string, unknown>;
    return readWorkspaceSettings((o.public_metadata as Record<string, unknown>) ?? {});
  }
}

class FetchClerkMemberLimitGateway implements OrgMemberLimitGateway {
  constructor(private readonly secret: string) {}

  async getSeatSnapshot(orgId: string) {
    const res = await fetch(`${CLERK_API}/organizations/${orgId}`, {
      headers: { Authorization: `Bearer ${this.secret}` },
    });
    assert(res.ok, `getOrganization seats: HTTP ${res.status}`);
    const o = (await res.json()) as {
      members_count?: number;
      max_allowed_memberships?: number | null;
    };
    return {
      activeMembers: o.members_count ?? 0,
      pendingInvites: 0,
      maxAllowedMemberships: o.max_allowed_memberships ?? null,
    };
  }

  async setMaxAllowedMemberships(orgId: string, limit: number): Promise<void> {
    const res = await fetch(`${CLERK_API}/organizations/${orgId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${this.secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ max_allowed_memberships: limit }),
    });
    const body = await res.text();
    assert(res.ok, `setMaxAllowedMemberships: HTTP ${res.status} ${body}`);
  }

  async resolveRevokeActorUserId(_orgId: string): Promise<string | null> {
    return null;
  }

  async revokeInvitation(_input: {
    organizationId: string;
    invitationId: string;
    requestingUserId: string;
  }): Promise<void> {
    /* unused in this smoke */
  }
}

async function runOffline() {
  console.log("→ Offline EnsureFreeOrgOnCreate");
  const store = new MemoryOrgMetadataStore();
  const members = new MemoryOrgMemberLimitGateway();
  const ensure = new EnsureFreeOrgOnCreate(store, new SyncOrgBillingEntitlements(store));
  const seats = new SyncOrgMemberLimit(store, members);

  const applied = await ensure.execute("org_smoke_free_new");
  assert(applied === "applied", "expected applied");
  await seats.execute("org_smoke_free_new");
  const meta = await store.getPublicMetadata("org_smoke_free_new");
  assert(meta.billingPlanSlug === "free_org", "slug free_org");
  assert(meta.entitlements.join() === "weather", "entitlements weather");
  assert((await members.getSeatSnapshot("org_smoke_free_new")).maxAllowedMemberships === 2, "seats 2");

  const again = await ensure.execute("org_smoke_free_new");
  assert(again === "skipped", "idempotent skip");

  await store.setWorkspaceSettings("org_smoke_paid", {
    entitlements: ["weather", "weather_plus"],
    authorizedParcelIds: [],
    billingPlanSlug: "weather_plus",
  });
  assert((await ensure.execute("org_smoke_paid")) === "skipped", "skip paid");
  console.log("  OK offline");
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function waitForFreeMeta(
  store: OrgMetadataStore,
  orgId: string,
  timeoutMs: number,
): Promise<WorkspaceSettings> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const meta = await store.getPublicMetadata(orgId);
    if (meta.billingPlanSlug === "free_org" && meta.entitlements.includes("weather")) {
      return meta;
    }
    await sleep(1500);
  }
  throw new Error(
    `Timeout waiting for free_org webhook on ${orgId}. Check Clerk webhook → stg/local and CLERK_WEBHOOK_SIGNING_SECRET.`,
  );
}

async function runLive() {
  const secret = process.env.CLERK_SECRET_KEY;
  assert(secret?.startsWith("sk_"), "CLERK_SECRET_KEY (sk_test_…) required for SMOKE_CLERK=1");
  const waitWebhook = process.env.SMOKE_FREE_WAIT_WEBHOOK === "1";
  const keep = process.env.SMOKE_FREE_KEEP === "1";

  console.log(`→ Live Clerk Free smoke (waitWebhook=${waitWebhook})`);

  const email = `smoke-free+clerk_test_${stamp}@example.com`;
  const userRes = await fetch(`${CLERK_API}/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: [email],
      password: "AgroFreeSmoke123!",
      skip_password_checks: true,
      skip_password_requirement: true,
    }),
  });
  const userBody = await userRes.text();
  assert(userRes.ok, `createUser: HTTP ${userRes.status} ${userBody}`);
  const user = JSON.parse(userBody) as { id: string };
  console.log(`  user ${user.id} (${email})`);

  let orgId: string | null = null;
  try {
    const orgRes = await fetch(`${CLERK_API}/organizations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Smoke Free ${stamp}`,
        created_by: user.id,
      }),
    });
    const orgBody = await orgRes.text();
    assert(orgRes.ok, `createOrg: HTTP ${orgRes.status} ${orgBody}`);
    const org = JSON.parse(orgBody) as { id: string; public_metadata?: Record<string, unknown> };
    orgId = org.id;
    console.log(`  org ${org.id}`);

    const store = new FetchClerkOrgMetadataStore(secret);
    const members = new FetchClerkMemberLimitGateway(secret);
    const ensure = new EnsureFreeOrgOnCreate(store, new SyncOrgBillingEntitlements(store));
    const seats = new SyncOrgMemberLimit(store, members);

    let meta: WorkspaceSettings;
    if (waitWebhook) {
      console.log("  waiting for organization.created webhook…");
      meta = await waitForFreeMeta(store, org.id, 45_000);
      console.log("  webhook applied Free metadata");
    } else {
      const empty = await store.getPublicMetadata(org.id);
      if (empty.billingPlanSlug === "free_org") {
        meta = empty;
        console.log("  metadata already Free (webhook beat us)");
      } else {
        assert((await ensure.execute(org.id)) === "applied", "live apply");
        await seats.execute(org.id);
        meta = await store.getPublicMetadata(org.id);
        console.log("  applied Free via EnsureFreeOrgOnCreate (no wait)");
      }
    }

    assert(meta.billingPlanSlug === "free_org", "live slug");
    assert(meta.entitlements.includes("weather"), "live weather");
    assert(meta.entitlements.every((e) => e === "weather"), "live only weather");

    const seatSnap = await members.getSeatSnapshot(org.id);
    if (seatSnap.maxAllowedMemberships !== 2) {
      await seats.execute(org.id);
    }
    const seatsAfter = await members.getSeatSnapshot(org.id);
    assert(
      seatsAfter.maxAllowedMemberships === 2,
      `live seats want 2 got ${seatsAfter.maxAllowedMemberships}`,
    );

    assert((await ensure.execute(org.id)) === "skipped", "live idempotent");
    console.log("  OK live");
  } finally {
    if (!keep) {
      if (orgId) {
        await fetch(`${CLERK_API}/organizations/${orgId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${secret}` },
        });
      }
      await fetch(`${CLERK_API}/users/${user.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${secret}` },
      });
      console.log("  cleaned up user+org");
    } else {
      console.log("  SMOKE_FREE_KEEP=1 — left user+org in place");
    }
  }
}

async function main() {
  console.log("Free self-serve smoke (ADR-061)");
  await runOffline();
  if (process.env.SMOKE_CLERK === "1") {
    await runLive();
  } else {
    console.log("→ Skip live (set SMOKE_CLERK=1 to hit Clerk Dev)");
  }
  console.log("PASS");
}

main().catch((err) => {
  console.error("FAIL", err);
  process.exit(1);
});
