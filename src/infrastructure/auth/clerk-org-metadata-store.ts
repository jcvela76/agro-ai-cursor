import { clerkClient } from "@clerk/nextjs/server";
import {
  normalizeEntitlements,
  normalizeParcelIds,
  type OrgMetadataStore,
  type WorkspaceSettings,
} from "@/domain/workspace/types";

export class ClerkOrgMetadataStore implements OrgMetadataStore {
  async getPublicMetadata(orgId: string): Promise<WorkspaceSettings> {
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    const metadata = org.publicMetadata ?? {};
    return readWorkspaceSettings(metadata);
  }

  async setWorkspaceSettings(orgId: string, settings: WorkspaceSettings): Promise<WorkspaceSettings> {
    const client = await clerkClient();
    const current = await client.organizations.getOrganization({ organizationId: orgId });
    const existing = { ...(current.publicMetadata ?? {}) };
    const org = await client.organizations.replaceOrganizationMetadata(orgId, {
      publicMetadata: {
        ...existing,
        entitlements: settings.entitlements,
        authorizedParcelIds: settings.authorizedParcelIds,
        billingPlanSlug: settings.billingPlanSlug ?? existing.billingPlanSlug ?? null,
      },
    });
    return readWorkspaceSettings(org.publicMetadata ?? {});
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

/** In-memory store for tests. */
export class MemoryOrgMetadataStore implements OrgMetadataStore {
  private readonly byOrg = new Map<string, WorkspaceSettings>();

  constructor(seed?: Record<string, WorkspaceSettings>) {
    if (seed) {
      for (const [orgId, settings] of Object.entries(seed)) {
        this.byOrg.set(orgId, {
          entitlements: [...settings.entitlements],
          authorizedParcelIds: [...settings.authorizedParcelIds],
          billingPlanSlug: settings.billingPlanSlug ?? null,
        });
      }
    }
  }

  async getPublicMetadata(orgId: string): Promise<WorkspaceSettings> {
    return (
      this.byOrg.get(orgId) ?? {
        entitlements: [],
        authorizedParcelIds: [],
        billingPlanSlug: null,
      }
    );
  }

  async setWorkspaceSettings(orgId: string, settings: WorkspaceSettings): Promise<WorkspaceSettings> {
    const next = {
      entitlements: [...settings.entitlements],
      authorizedParcelIds: [...settings.authorizedParcelIds],
      billingPlanSlug: settings.billingPlanSlug ?? null,
    };
    this.byOrg.set(orgId, next);
    return next;
  }
}
