/** Traceability domain contracts — runtime deferred to phase 2. */

export interface TraceLot {
  id: string;
  orgId: string;
  cropType: string;
  harvestSeason: string;
  status: "draft" | "verified" | "exported";
}

export interface TraceEvent {
  id: string;
  lotId: string;
  eventType: string;
  occurredAt: string;
  actorId: string;
  evidenceRef?: string;
}

export interface ParcelLink {
  parcelId: string;
  lotId: string;
  linkedAt: string;
}
