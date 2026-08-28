import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import {
  authorizeWeatherAccess,
  authorizeWeatherPlusAccess,
} from "@/domain/auth/authorize-weather-access";
import type {
  ParcelAgronomicProfile,
  ParcelAgronomicProfileRegistry,
  UpdateParcelAgronomicProfileFields,
} from "@/domain/parcel/agronomic-profile";
import { emptyParcelAgronomicProfile } from "@/domain/parcel/agronomic-profile";
import type { ParcelRegistry } from "@/domain/parcel/types";

export type ParcelProfileResult =
  | { ok: true; data: ParcelAgronomicProfile }
  | { ok: false; reason: "unavailable"; message: string };

async function authorizeParcelProfile(
  parcels: ParcelRegistry,
  authority: AccessSnapshot | null | undefined,
  parcelId: string,
): Promise<
  | { ok: true; authority: AccessSnapshot; orgId: string }
  | { ok: false; reason: "unavailable"; message: string }
> {
  if (!authorizeWeatherPlusAccess(authority) || !authority) {
    return {
      ok: false,
      reason: "unavailable",
      message: "Weather Intelligence Plus is required for parcel profile.",
    };
  }

  const parcel = await parcels.getParcel(parcelId);
  if (!parcel) {
    return {
      ok: false,
      reason: "unavailable",
      message: "Parcel profile is not available for this request.",
    };
  }

  const access = authorizeWeatherAccess(authority, parcelId, parcel.orgId);
  if (!access.ok) {
    return {
      ok: false,
      reason: "unavailable",
      message: "Parcel profile is not available for this request.",
    };
  }

  return { ok: true, authority, orgId: parcel.orgId };
}

export class GetParcelAgronomicProfile {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly profiles: ParcelAgronomicProfileRegistry,
  ) {}

  async execute(input: {
    authority: AccessSnapshot | null | undefined;
    parcelId: string;
  }): Promise<ParcelProfileResult> {
    const gate = await authorizeParcelProfile(this.parcels, input.authority, input.parcelId);
    if (!gate.ok) {
      return gate;
    }

    const existing = await this.profiles.getByParcelId(gate.orgId, input.parcelId);
    return {
      ok: true,
      data: existing ?? emptyParcelAgronomicProfile(gate.orgId, input.parcelId),
    };
  }
}

export class UpdateParcelAgronomicProfile {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly profiles: ParcelAgronomicProfileRegistry,
  ) {}

  async execute(input: {
    authority: AccessSnapshot | null | undefined;
    parcelId: string;
    fields: UpdateParcelAgronomicProfileFields;
  }): Promise<ParcelProfileResult> {
    const gate = await authorizeParcelProfile(this.parcels, input.authority, input.parcelId);
    if (!gate.ok) {
      return gate;
    }

    if (Object.keys(input.fields).length === 0) {
      const existing = await this.profiles.getByParcelId(gate.orgId, input.parcelId);
      return {
        ok: true,
        data: existing ?? emptyParcelAgronomicProfile(gate.orgId, input.parcelId),
      };
    }

    const saved = await this.profiles.upsert({
      parcelId: input.parcelId,
      orgId: gate.orgId,
      updatedByUserId: gate.authority.userId,
      fields: input.fields,
    });

    return { ok: true, data: saved };
  }
}
