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
    return {
      entitlements: normalizeEntitlements(metadata.entitlements),
      authorizedParcelIds: normalizeParcelIds(metadata.authorizedParcelIds),
    };
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
      },
    });
    const metadata = org.publicMetadata ?? {};
    return {
      entitlements: normalizeEntitlements(metadata.entitlements),
      authorizedParcelIds: normalizeParcelIds(metadata.authorizedParcelIds),
    };
  }
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
        });
      }
    }
  }

  async getPublicMetadata(orgId: string): Promise<WorkspaceSettings> {
    return (
      this.byOrg.get(orgId) ?? {
        entitlements: [],
        authorizedParcelIds: [],
      }
    );
  }

  async setWorkspaceSettings(orgId: string, settings: WorkspaceSettings): Promise<WorkspaceSettings> {
    const next = {
      entitlements: [...settings.entitlements],
      authorizedParcelIds: [...settings.authorizedParcelIds],
    };
    this.byOrg.set(orgId, next);
    return next;
  }
}
