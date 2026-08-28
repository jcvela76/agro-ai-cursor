import type {
  ParcelAgronomicProfile,
  ParcelAgronomicProfileRegistry,
  UpsertParcelAgronomicProfileInput,
} from "@/domain/parcel/agronomic-profile";
import {
  emptyParcelAgronomicProfile,
  mergeProfileFields,
} from "@/domain/parcel/agronomic-profile";

export class OfflineParcelAgronomicProfileRegistry implements ParcelAgronomicProfileRegistry {
  private readonly byParcel = new Map<string, ParcelAgronomicProfile>();

  async getByParcelId(orgId: string, parcelId: string): Promise<ParcelAgronomicProfile | null> {
    const profile = this.byParcel.get(parcelId);
    if (!profile || profile.orgId !== orgId) {
      return null;
    }
    return { ...profile };
  }

  async upsert(input: UpsertParcelAgronomicProfileInput): Promise<ParcelAgronomicProfile> {
    const existing = await this.getByParcelId(input.orgId, input.parcelId);
    const base = existing ?? emptyParcelAgronomicProfile(input.orgId, input.parcelId);
    const merged = mergeProfileFields(base, input.fields);
    const profile: ParcelAgronomicProfile = {
      ...merged,
      updatedAt: new Date().toISOString(),
      updatedByUserId: input.updatedByUserId,
    };
    this.byParcel.set(input.parcelId, profile);
    return { ...profile };
  }
}
