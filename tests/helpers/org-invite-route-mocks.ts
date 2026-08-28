import { MemoryOrgMetadataStore } from "@/infrastructure/auth/clerk-org-metadata-store";

export const inviteOrgId = "org_invite_test";

const store = new MemoryOrgMetadataStore({
  [inviteOrgId]: {
    entitlements: ["weather"],
    authorizedParcelIds: [],
    billingPlanSlug: "free_org",
  },
});

export function createInviteMetadataStore() {
  return store;
}
