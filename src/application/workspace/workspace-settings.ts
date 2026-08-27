import {
  normalizeEntitlements,
  normalizeParcelIds,
  type OrgMetadataStore,
  type WorkspaceSettings,
} from "@/domain/workspace/types";

export class GetWorkspaceSettings {
  constructor(private readonly store: OrgMetadataStore) {}

  async execute(orgId: string): Promise<WorkspaceSettings> {
    return this.store.getPublicMetadata(orgId);
  }
}

export class UpdateWorkspaceSettings {
  constructor(private readonly store: OrgMetadataStore) {}

  async execute(input: {
    orgId: string;
    entitlements: unknown;
    authorizedParcelIds: unknown;
  }): Promise<WorkspaceSettings> {
    const settings: WorkspaceSettings = {
      entitlements: normalizeEntitlements(input.entitlements),
      authorizedParcelIds: normalizeParcelIds(input.authorizedParcelIds),
    };
    return this.store.setWorkspaceSettings(input.orgId, settings);
  }
}
