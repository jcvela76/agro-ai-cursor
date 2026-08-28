import { ListOrgTraceLots } from "@/application/traceability/list-org-trace-lots";
import {
  AppendOrgTraceEvent,
  CreateOrgTraceLot,
  UpdateOrgTraceLotEudr,
} from "@/application/traceability/mutate-org-trace-lots";
import {
  defaultSyntheticSnapshots,
  SyntheticAccessResolver,
} from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineTraceLotRegistry } from "@/infrastructure/traceability/offline-trace-lot-registry";

const registry = new OfflineTraceLotRegistry();
const parcels = new SyntheticParcelRegistry();

export const traceRouteContainerMock = {
  createAccessResolver: () => new SyntheticAccessResolver(defaultSyntheticSnapshots),
  listOrgTraceLots: new ListOrgTraceLots(registry),
  createOrgTraceLot: new CreateOrgTraceLot(registry, parcels),
  appendOrgTraceEvent: new AppendOrgTraceEvent(registry),
  updateOrgTraceLotEudr: new UpdateOrgTraceLotEudr(registry),
};

export { defaultSyntheticSnapshots };
