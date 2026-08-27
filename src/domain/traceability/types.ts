/** Traceability domain contracts — Trace-1 Lot Core. */

export type TraceLotStatus = "draft" | "verified" | "exported";

/** Closed event set for coffee pilot v1 (ADR-021). */
export type TraceEventType = "planted" | "harvested" | "processed" | "exported";

export interface TraceLot {
  id: string;
  orgId: string;
  name: string;
  cropType: string;
  harvestSeason: string;
  status: TraceLotStatus;
}

export interface TraceEvent {
  id: string;
  lotId: string;
  eventType: TraceEventType;
  occurredAt: string;
  actorId: string;
  evidenceRef?: string;
}

export interface ParcelLink {
  parcelId: string;
  lotId: string;
  linkedAt: string;
}

/** Org-scoped lot view without parcel geometry. */
export interface TraceLotView {
  lot: TraceLot;
  events: TraceEvent[];
  parcelLinks: ParcelLink[];
}

export interface TraceLotRegistry {
  listLotsByOrg(orgId: string): Promise<TraceLotView[]>;
}
