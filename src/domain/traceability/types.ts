/** Traceability domain contracts — Trace-1..4 (Lot Core + mutations + EUDR catalog). */

export type TraceLotStatus = "draft" | "verified" | "exported";

/** Closed event set for coffee pilot v1 (ADR-021). */
export type TraceEventType = "planted" | "harvested" | "processed" | "exported";

export const TRACE_EVENT_TYPES: readonly TraceEventType[] = [
  "planted",
  "harvested",
  "processed",
  "exported",
] as const;

/** Default country for Peru pilot (ADR-024). */
export const DEFAULT_COUNTRY_OF_PRODUCTION = "PE";

export interface TraceLot {
  id: string;
  orgId: string;
  name: string;
  cropType: string;
  harvestSeason: string;
  status: TraceLotStatus;
  /** ISO 3166-1 alpha-2. */
  countryOfProduction: string;
  producerName: string;
  /** YYYY-MM-DD when production of the lot ended; required before export. */
  productionEndDate?: string;
  deforestationFreeDeclared: boolean;
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
  countryOfProduction: string;
  producerName: string;
  productionEndDate?: string;
  deforestationFreeDeclared: boolean;
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

export type EudrMissingField =
  | "producerName"
  | "countryOfProduction"
  | "productionEndDate"
  | "deforestationFreeDeclared"
  | "parcelLink";

export function isIsoCountryCode(value: string): boolean {
  return /^[A-Z]{2}$/.test(value);
}

export function isIsoDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const t = Date.parse(`${value}T12:00:00Z`);
  return !Number.isNaN(t);
}

/**
 * Export readiness for coffee pilot EUDR catalog (ADR-024).
 * Geolocation is satisfied by ≥1 parcel link (geometry lives in Parcel Core).
 */
export function evaluateEudrExportReadiness(
  view: TraceLotView,
): { ok: true } | { ok: false; missing: EudrMissingField[] } {
  const missing: EudrMissingField[] = [];
  const { lot, parcelLinks } = view;

  if (!lot.producerName.trim()) {
    missing.push("producerName");
  }
  if (!isIsoCountryCode(lot.countryOfProduction)) {
    missing.push("countryOfProduction");
  }
  if (!lot.productionEndDate || !isIsoDateOnly(lot.productionEndDate)) {
    missing.push("productionEndDate");
  }
  if (!lot.deforestationFreeDeclared) {
    missing.push("deforestationFreeDeclared");
  }
  if (parcelLinks.length === 0) {
    missing.push("parcelLink");
  }

  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

export interface UpdateTraceLotEudrInput {
  lotId: string;
  producerName?: string;
  countryOfProduction?: string;
  /** Pass null to clear. */
  productionEndDate?: string | null;
  deforestationFreeDeclared?: boolean;
}

export interface TraceLotRegistry {
  listLotsByOrg(orgId: string): Promise<TraceLotView[]>;
  getLotView(lotId: string): Promise<TraceLotView | undefined>;
  createLot(input: CreateTraceLotInput): Promise<TraceLotView>;
  appendEvent(input: AppendTraceEventInput): Promise<TraceLotView>;
  updateLotEudr(input: UpdateTraceLotEudrInput): Promise<TraceLotView>;
}
