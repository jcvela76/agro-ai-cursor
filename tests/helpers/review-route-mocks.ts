import { AppendOrgReviewDecision } from "@/application/review/append-org-review-decision";
import { ListOrgReviewDecisions } from "@/application/review/list-org-review-decisions";
import {
  defaultSyntheticSnapshots,
  SyntheticAccessResolver,
} from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineReviewDecisionRegistry } from "@/infrastructure/review/offline-review-registry";

const registry = new OfflineReviewDecisionRegistry();
const parcels = new SyntheticParcelRegistry();

export const reviewRouteContainerMock = {
  createAccessResolver: () => new SyntheticAccessResolver(defaultSyntheticSnapshots),
  listOrgReviewDecisions: new ListOrgReviewDecisions(registry),
  appendOrgReviewDecision: new AppendOrgReviewDecision(registry, parcels),
};

export { defaultSyntheticSnapshots };
