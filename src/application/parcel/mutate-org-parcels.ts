import { randomUUID } from "node:crypto";
import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import { isValidPolygon, polygonCentroid } from "@/domain/parcel/geometry";
import type { Parcel, ParcelGeometry, ParcelRegistry } from "@/domain/parcel/types";

export type ParcelMutationDenied =
  | { ok: false; reason: "unauthenticated" | "no_org" | "inactive_member" | "not_found" | "invalid_geometry" | "cross_org"; message: string };

export type ParcelMutationResult = { ok: true; data: Parcel } | ParcelMutationDenied;
export type ParcelDeleteResult =
  | { ok: true }
  | ParcelMutationDenied;

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

export class CreateOrgParcel {
  constructor(private readonly parcels: ParcelRegistry) {}

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
  constructor(private readonly parcels: ParcelRegistry) {}

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
      patch.geometry = input.geometry;
      const c = polygonCentroid(input.geometry);
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
