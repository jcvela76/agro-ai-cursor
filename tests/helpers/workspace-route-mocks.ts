import {
  GetWorkspaceSettings,
  UpdateWorkspaceSettings,
} from "@/application/workspace/workspace-settings";
import { MemoryOrgMetadataStore } from "@/infrastructure/auth/clerk-org-metadata-store";

export const workspaceOrgId = "org_admin_test";

const store = new MemoryOrgMetadataStore({
  [workspaceOrgId]: {
    entitlements: ["weather"],
    authorizedParcelIds: [],
    billingPlanSlug: "free_org",
  },
});

export const workspaceRouteContainerMock = {
  getWorkspaceSettings: new GetWorkspaceSettings(store),
  updateWorkspaceSettings: new UpdateWorkspaceSettings(store),
};
