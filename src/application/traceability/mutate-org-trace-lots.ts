import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import { authorizeTraceabilityAccess } from "@/domain/auth/authorize-traceability-access";
import type { ParcelRegistry } from "@/domain/parcel/types";
import {
  DEFAULT_COUNTRY_OF_PRODUCTION,
  TRACE_EVENT_TYPES,
  evaluateEudrExportReadiness,
  isIsoCountryCode,
  isIsoDateOnly,
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
  | "cross_org_parcel"
  | "eudr_incomplete";

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
    countryOfProduction?: string;
    producerName: string;
    productionEndDate?: string | null;
    deforestationFreeDeclared?: boolean;
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
    const producerName = input.producerName.trim();
    const countryOfProduction = (
      input.countryOfProduction?.trim() || DEFAULT_COUNTRY_OF_PRODUCTION
    ).toUpperCase();
    const productionEndDate = input.productionEndDate?.trim() || undefined;
    const deforestationFreeDeclared = Boolean(input.deforestationFreeDeclared);

    if (!name || !harvestSeason || !producerName) {
      return {
        ok: false,
        reason: "invalid_input",
        message: "name, harvestSeason and producerName are required",
      };
    }

    if (!isIsoCountryCode(countryOfProduction)) {
      return {
        ok: false,
        reason: "invalid_input",
        message: "countryOfProduction must be an ISO 3166-1 alpha-2 code",
      };
    }

    if (productionEndDate && !isIsoDateOnly(productionEndDate)) {
      return {
        ok: false,
        reason: "invalid_input",
        message: "productionEndDate must be YYYY-MM-DD",
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
      countryOfProduction,
      producerName,
      productionEndDate,
      deforestationFreeDeclared,
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

    if (input.eventType === "exported") {
      const readiness = evaluateEudrExportReadiness(existing);
      if (!readiness.ok) {
        return {
          ok: false,
          reason: "eudr_incomplete",
          message: `EUDR catalog incomplete: ${readiness.missing.join(", ")}`,
        };
      }
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

export class UpdateOrgTraceLotEudr {
  constructor(private readonly lots: TraceLotRegistry) {}

  async execute(input: {
    authority: AccessSnapshot | null | undefined;
    orgId: string | null | undefined;
    lotId: string;
    producerName?: string;
    countryOfProduction?: string;
    productionEndDate?: string | null;
    deforestationFreeDeclared?: boolean;
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

    const existing = await this.lots.getLotView(input.lotId);
    if (!existing || existing.lot.orgId !== orgId) {
      return {
        ok: false,
        reason: "not_found",
        message: "Lot is not available",
      };
    }

    if (existing.lot.status === "exported") {
      return {
        ok: false,
        reason: "invalid_input",
        message: "EUDR fields cannot be changed after export",
      };
    }

    const patch: {
      lotId: string;
      producerName?: string;
      countryOfProduction?: string;
      productionEndDate?: string | null;
      deforestationFreeDeclared?: boolean;
    } = { lotId: input.lotId };

    if (input.producerName !== undefined) {
      const producerName = input.producerName.trim();
      if (!producerName) {
        return {
          ok: false,
          reason: "invalid_input",
          message: "producerName is required when provided",
        };
      }
      patch.producerName = producerName;
    }

    if (input.countryOfProduction !== undefined) {
      const country = input.countryOfProduction.trim().toUpperCase();
      if (!isIsoCountryCode(country)) {
        return {
          ok: false,
          reason: "invalid_input",
          message: "countryOfProduction must be an ISO 3166-1 alpha-2 code",
        };
      }
      patch.countryOfProduction = country;
    }

    if (input.productionEndDate !== undefined) {
      if (input.productionEndDate === null || input.productionEndDate === "") {
        patch.productionEndDate = null;
      } else {
        const date = input.productionEndDate.trim();
        if (!isIsoDateOnly(date)) {
          return {
            ok: false,
            reason: "invalid_input",
            message: "productionEndDate must be YYYY-MM-DD",
          };
        }
        patch.productionEndDate = date;
      }
    }

    if (input.deforestationFreeDeclared !== undefined) {
      patch.deforestationFreeDeclared = Boolean(input.deforestationFreeDeclared);
    }

    const data = await this.lots.updateLotEudr(patch);
    return { ok: true, data };
  }
}
