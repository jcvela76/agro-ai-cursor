import { randomUUID } from "node:crypto";
import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import {
  inferPlanSlugForQuota,
  parcelCountLimitForPlan,
  parcelMaxHaForPlan,
  parcelQuotaUsage,
} from "@/domain/billing/plan-limits";
import {
  approximateAreaHectares,
  isValidPolygon,
  polygonCentroid,
} from "@/domain/parcel/geometry";
import type { Parcel, ParcelGeometry, ParcelRegistry } from "@/domain/parcel/types";
import type { OrgMetadataStore } from "@/domain/workspace/types";

export type ParcelMutationDenyReason =
  | "unauthenticated"
  | "no_org"
  | "inactive_member"
  | "not_found"
  | "invalid_geometry"
  | "cross_org"
  | "parcel_limit"
  | "parcel_area_limit";

export type ParcelMutationDenied = {
  ok: false;
  reason: ParcelMutationDenyReason;
  message: string;
};

export type ParcelMutationResult = { ok: true; data: Parcel } | ParcelMutationDenied;
export type ParcelDeleteResult = { ok: true } | ParcelMutationDenied;

export type ParcelQuotaSnapshot = {
  planSlug: string;
  limit: number;
  used: number;
  remaining: number;
  blocked: boolean;
  maxHaPerParcel: number;
};

const AREA_EXPAND_EPS_HA = 0.01;

function requireOrgMember(
  authority: AccessSnapshot | null | undefined,
  orgId: string | null | undefined,
): { ok: true; orgId: string; authority: AccessSnapshot } | ParcelMutationDenied {
  if (!authority?.userId) {
    return { ok: false, reason: "unauthenticated", message: "Authentication required" };
  }
  if (!authority.isActiveMember) {
    return { ok: false, reason: "inactive_member", message: "Active membership required" };
  }
  const resolvedOrg = orgId ?? authority.orgId;
  if (!resolvedOrg) {
    return { ok: false, reason: "no_org", message: "Active organization required" };
  }
  if (authority.orgId !== resolvedOrg) {
    return { ok: false, reason: "cross_org", message: "Organization mismatch" };
  }
  return { ok: true, orgId: resolvedOrg, authority };
}

async function resolvePlanSlug(
  metadata: OrgMetadataStore | null | undefined,
  authority: AccessSnapshot,
  orgId: string,
): Promise<string> {
  if (metadata) {
    const settings = await metadata.getPublicMetadata(orgId);
    return inferPlanSlugForQuota({
      billingPlanSlug: settings.billingPlanSlug,
      entitlements:
        settings.entitlements.length > 0 ? settings.entitlements : authority.entitlements,
    });
  }
  return inferPlanSlugForQuota({
    billingPlanSlug: null,
    entitlements: authority.entitlements,
  });
}

export async function resolveParcelQuota(input: {
  parcels: ParcelRegistry;
  metadata?: OrgMetadataStore | null;
  authority: AccessSnapshot;
  orgId: string;
}): Promise<ParcelQuotaSnapshot> {
  const existing = await input.parcels.listByOrgId(input.orgId);
  const planSlug = await resolvePlanSlug(input.metadata, input.authority, input.orgId);
  const usage = parcelQuotaUsage({ used: existing.length, planSlug });
  return { planSlug, ...usage };
}

export class CreateOrgParcel {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly metadata: OrgMetadataStore | null = null,
  ) {}

  async execute(input: {
    authority: AccessSnapshot | null | undefined;
    orgId: string | null | undefined;
    name: string;
    geometry: unknown;
    timezone?: string;
  }): Promise<ParcelMutationResult> {
    const gate = requireOrgMember(input.authority, input.orgId);
    if (!gate.ok) {
      return gate;
    }
    if (!isValidPolygon(input.geometry)) {
      return {
        ok: false,
        reason: "invalid_geometry",
        message: "geometry must be a closed GeoJSON Polygon",
      };
    }
    const name = input.name.trim();
    if (!name) {
      return { ok: false, reason: "invalid_geometry", message: "name is required" };
    }

    const geometry = input.geometry as ParcelGeometry;
    const planSlug = await resolvePlanSlug(this.metadata, gate.authority, gate.orgId);
    const existing = await this.parcels.listByOrgId(gate.orgId);
    const countLimit = parcelCountLimitForPlan(planSlug);
    if (existing.length >= countLimit) {
      return {
        ok: false,
        reason: "parcel_limit",
        message: `Tu plan permite hasta ${countLimit} parcelas. Mejora el plan en Facturación para agregar más.`,
      };
    }

    const ha = approximateAreaHectares(geometry);
    const maxHa = parcelMaxHaForPlan(planSlug);
    if (ha > maxHa) {
      return {
        ok: false,
        reason: "parcel_area_limit",
        message: `Esta parcela tiene ~${ha.toFixed(1)} ha; tu plan permite hasta ${maxHa} ha por parcela. Reduce el polígono o mejora el plan.`,
      };
    }

    const { latitude, longitude } = polygonCentroid(geometry);
    const parcel = await this.parcels.create({
      id: `parcel-${randomUUID()}`,
      orgId: gate.orgId,
      name,
      latitude,
      longitude,
      timezone: input.timezone ?? "America/Lima",
      geometry,
    });
    return { ok: true, data: parcel };
  }
}

export class UpdateOrgParcel {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly metadata: OrgMetadataStore | null = null,
  ) {}

  async execute(input: {
    authority: AccessSnapshot | null | undefined;
    orgId: string | null | undefined;
    parcelId: string;
    name?: string;
    geometry?: unknown;
    timezone?: string;
  }): Promise<ParcelMutationResult> {
    const gate = requireOrgMember(input.authority, input.orgId);
    if (!gate.ok) {
      return gate;
    }

    const existing = await this.parcels.getParcel(input.parcelId);
    if (!existing || existing.orgId !== gate.orgId) {
      return { ok: false, reason: "not_found", message: "Parcel not available" };
    }

    const patch: {
      name?: string;
      geometry?: ParcelGeometry;
      latitude?: number;
      longitude?: number;
      timezone?: string;
    } = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        return { ok: false, reason: "invalid_geometry", message: "name is required" };
      }
      patch.name = name;
    }

    if (input.geometry !== undefined) {
      if (!isValidPolygon(input.geometry)) {
        return {
          ok: false,
          reason: "invalid_geometry",
          message: "geometry must be a closed GeoJSON Polygon",
        };
      }
      const newGeometry = input.geometry as ParcelGeometry;
      const planSlug = await resolvePlanSlug(this.metadata, gate.authority, gate.orgId);
      const maxHa = parcelMaxHaForPlan(planSlug);
      const newHa = approximateAreaHectares(newGeometry);
      const oldHa = existing.geometry ? approximateAreaHectares(existing.geometry) : 0;

      // Grandfather: allow shrink/rename while still over max; deny expand beyond max.
      if (newHa > maxHa && newHa > oldHa + AREA_EXPAND_EPS_HA) {
        return {
          ok: false,
          reason: "parcel_area_limit",
          message: `No puedes ampliar por encima de ${maxHa} ha (plan actual). Reduce el polígono o mejora el plan en Facturación.`,
        };
      }

      patch.geometry = newGeometry;
      const c = polygonCentroid(newGeometry);
      patch.latitude = c.latitude;
      patch.longitude = c.longitude;
    }

    if (input.timezone !== undefined) {
      patch.timezone = input.timezone;
    }

    const updated = await this.parcels.update(input.parcelId, patch);
    if (!updated) {
      return { ok: false, reason: "not_found", message: "Parcel not available" };
    }
    return { ok: true, data: updated };
  }
}

export class DeleteOrgParcel {
  constructor(private readonly parcels: ParcelRegistry) {}

  async execute(input: {
    authority: AccessSnapshot | null | undefined;
    orgId: string | null | undefined;
    parcelId: string;
  }): Promise<ParcelDeleteResult> {
    const gate = requireOrgMember(input.authority, input.orgId);
    if (!gate.ok) {
      return gate;
    }

    const existing = await this.parcels.getParcel(input.parcelId);
    if (!existing || existing.orgId !== gate.orgId) {
      return { ok: false, reason: "not_found", message: "Parcel not available" };
    }

    const deleted = await this.parcels.delete(input.parcelId);
    if (!deleted) {
      return { ok: false, reason: "not_found", message: "Parcel not available" };
    }
    return { ok: true };
  }
}
