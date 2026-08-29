import { ListOrgParcels } from "@/application/parcel/list-org-parcels";
import {
  CreateOrgParcel,
  DeleteOrgParcel,
  UpdateOrgParcel,
} from "@/application/parcel/mutate-org-parcels";
import { MemoryOrgMetadataStore } from "@/infrastructure/auth/clerk-org-metadata-store";
import {
  defaultSyntheticSnapshots,
  SyntheticAccessResolver,
} from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";

const registry = new SyntheticParcelRegistry();
const orgMetadataStore = new MemoryOrgMetadataStore({
  org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G: {
    entitlements: ["weather"],
    authorizedParcelIds: [],
    billingPlanSlug: "free",
  },
  "org-cusco-cacao": {
    entitlements: ["weather"],
    authorizedParcelIds: [],
    billingPlanSlug: "free",
  },
});

export const parcelRouteContainerMock = {
  createAccessResolver: () => new SyntheticAccessResolver(defaultSyntheticSnapshots),
  listOrgParcels: new ListOrgParcels(registry),
  createOrgParcel: new CreateOrgParcel(registry, orgMetadataStore),
  updateOrgParcel: new UpdateOrgParcel(registry, orgMetadataStore),
  deleteOrgParcel: new DeleteOrgParcel(registry),
  parcelRegistry: registry,
  orgMetadataStore,
};

export { defaultSyntheticSnapshots };
