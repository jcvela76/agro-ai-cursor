import { ListOrgParcels } from "@/application/parcel/list-org-parcels";
import {
  CreateOrgParcel,
  DeleteOrgParcel,
  UpdateOrgParcel,
} from "@/application/parcel/mutate-org-parcels";
import {
  defaultSyntheticSnapshots,
  SyntheticAccessResolver,
} from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";

const registry = new SyntheticParcelRegistry();

export const parcelRouteContainerMock = {
  createAccessResolver: () => new SyntheticAccessResolver(defaultSyntheticSnapshots),
  listOrgParcels: new ListOrgParcels(registry),
  createOrgParcel: new CreateOrgParcel(registry),
  updateOrgParcel: new UpdateOrgParcel(registry),
  deleteOrgParcel: new DeleteOrgParcel(registry),
};

export { defaultSyntheticSnapshots };
