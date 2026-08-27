import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import type { Parcel, ParcelRegistry } from "@/domain/parcel/types";

export type ListOrgParcelsResult =
  | { ok: true; data: Parcel[] }
  | { ok: false; reason: "unauthenticated" | "no_org"; message: string };

/**
 * Parcel Core list — org-scoped only. Does not require Weather entitlement.
 */
export class ListOrgParcels {
  constructor(private readonly parcels: ParcelRegistry) {}

  async execute(input: {
    authority: AccessSnapshot | null | undefined;
    orgId: string | null | undefined;
  }): Promise<ListOrgParcelsResult> {
    if (!input.authority || !input.authority.userId) {
      return {
        ok: false,
        reason: "unauthenticated",
        message: "Authentication required",
      };
    }

    const orgId = input.orgId ?? input.authority.orgId;
    if (!orgId) {
      return {
        ok: false,
        reason: "no_org",
        message: "Active organization required",
      };
    }

    if (input.authority.orgId !== orgId) {
      return { ok: true, data: [] };
    }

    const data = await this.parcels.listByOrgId(orgId);
    return { ok: true, data };
  }
}
