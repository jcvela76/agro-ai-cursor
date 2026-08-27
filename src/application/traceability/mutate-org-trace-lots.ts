import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import { authorizeTraceabilityAccess } from "@/domain/auth/authorize-traceability-access";
import type { ParcelRegistry } from "@/domain/parcel/types";
import {
  TRACE_EVENT_TYPES,
  type TraceEventType,
  type TraceLotRegistry,
  type TraceLotView,
} from "@/domain/traceability/types";

export type TraceMutationDenyReason =
  | "unauthenticated"
  | "inactive_member"
  | "missing_traceability_entitlement"
  | "no_org"
  | "not_found"
  | "invalid_input"
  | "cross_org_parcel";

export type TraceMutationResult =
  | { ok: true; data: TraceLotView }
  | { ok: false; reason: TraceMutationDenyReason; message: string };

function isTraceEventType(value: unknown): value is TraceEventType {
  return (
    typeof value === "string" &&
    (TRACE_EVENT_TYPES as readonly string[]).includes(value)
  );
}

function isIsoDateTime(value: string): boolean {
  const t = Date.parse(value);
  return !Number.isNaN(t);
}

export class CreateOrgTraceLot {
  constructor(
    private readonly lots: TraceLotRegistry,
    private readonly parcels: ParcelRegistry,
  ) {}

  async execute(input: {
    authority: AccessSnapshot | null | undefined;
    orgId: string | null | undefined;
    name: string;
    harvestSeason: string;
    cropType?: string;
    parcelId?: string | null;
  }): Promise<TraceMutationResult> {
    const access = authorizeTraceabilityAccess(input.authority);
    if (!access.ok) {
      return {
        ok: false,
        reason: access.reason,
        message: "Traceability data is not available for this request.",
      };
    }

    const orgId = input.orgId ?? input.authority!.orgId;
    if (!orgId || input.authority!.orgId !== orgId) {
      return {
        ok: false,
        reason: "no_org",
        message: "Traceability data is not available for this request.",
      };
    }

    const name = input.name.trim();
    const harvestSeason = input.harvestSeason.trim();
    const cropType = (input.cropType ?? "coffee").trim() || "coffee";
    if (!name || !harvestSeason) {
      return {
        ok: false,
        reason: "invalid_input",
        message: "name and harvestSeason are required",
      };
    }

    const parcelId = input.parcelId?.trim() || undefined;
    if (parcelId) {
      const parcel = await this.parcels.getParcel(parcelId);
      if (!parcel || parcel.orgId !== orgId) {
        return {
          ok: false,
          reason: "cross_org_parcel",
          message: "Parcel is not available in this organization",
        };
      }
    }

    const data = await this.lots.createLot({
      orgId,
      name,
      cropType,
      harvestSeason,
      parcelId,
    });
    return { ok: true, data };
  }
}

export class AppendOrgTraceEvent {
  constructor(private readonly lots: TraceLotRegistry) {}

  async execute(input: {
    authority: AccessSnapshot | null | undefined;
    orgId: string | null | undefined;
    lotId: string;
    eventType: unknown;
    occurredAt: string;
    evidenceRef?: string | null;
  }): Promise<TraceMutationResult> {
    const access = authorizeTraceabilityAccess(input.authority);
    if (!access.ok) {
      return {
        ok: false,
        reason: access.reason,
        message: "Traceability data is not available for this request.",
      };
    }

    const orgId = input.orgId ?? input.authority!.orgId;
    if (!orgId || input.authority!.orgId !== orgId) {
      return {
        ok: false,
        reason: "no_org",
        message: "Traceability data is not available for this request.",
      };
    }

    if (!isTraceEventType(input.eventType)) {
      return {
        ok: false,
        reason: "invalid_input",
        message: "eventType must be planted|harvested|processed|exported",
      };
    }

    const occurredAt = input.occurredAt.trim();
    if (!occurredAt || !isIsoDateTime(occurredAt)) {
      return {
        ok: false,
        reason: "invalid_input",
        message: "occurredAt must be a valid ISO datetime",
      };
    }

    const existing = await this.lots.getLotView(input.lotId);
    if (!existing || existing.lot.orgId !== orgId) {
      return {
        ok: false,
        reason: "not_found",
        message: "Lot is not available",
      };
    }

    const evidenceRef = input.evidenceRef?.trim() || undefined;
    const data = await this.lots.appendEvent({
      lotId: input.lotId,
      eventType: input.eventType,
      occurredAt,
      actorId: input.authority!.userId,
      evidenceRef,
    });
    return { ok: true, data };
  }
}
