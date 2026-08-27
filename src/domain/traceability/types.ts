/** Traceability domain contracts — Trace-1 Lot Core + Trace-2 mutations. */

export type TraceLotStatus = "draft" | "verified" | "exported";

/** Closed event set for coffee pilot v1 (ADR-021). */
export type TraceEventType = "planted" | "harvested" | "processed" | "exported";

export const TRACE_EVENT_TYPES: readonly TraceEventType[] = [
  "planted",
  "harvested",
  "processed",
  "exported",
] as const;

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

export interface CreateTraceLotInput {
  orgId: string;
  name: string;
  cropType: string;
  harvestSeason: string;
  /** Optional parcel link (parcelId only; no geometry stored). */
  parcelId?: string;
}

export interface AppendTraceEventInput {
  lotId: string;
  eventType: TraceEventType;
  occurredAt: string;
  actorId: string;
  evidenceRef?: string;
}

export interface TraceLotRegistry {
  listLotsByOrg(orgId: string): Promise<TraceLotView[]>;
  getLotView(lotId: string): Promise<TraceLotView | undefined>;
  createLot(input: CreateTraceLotInput): Promise<TraceLotView>;
  appendEvent(input: AppendTraceEventInput): Promise<TraceLotView>;
}
