import type { Parcel, ParcelRegistry } from "@/domain/parcel/types";
import syntheticParcels from "@/infrastructure/fixtures/synthetic-parcels.json";

export class SyntheticParcelRegistry implements ParcelRegistry {
  private readonly parcels: Map<string, Parcel>;

  constructor(parcels: Parcel[] = syntheticParcels as Parcel[]) {
    this.parcels = new Map(parcels.map((p) => [p.id, p]));
  }

  async getParcel(parcelId: string): Promise<Parcel | undefined> {
    return this.parcels.get(parcelId);
  }

  async listByOrgId(orgId: string): Promise<Parcel[]> {
    return [...this.parcels.values()].filter((p) => p.orgId === orgId);
  }
}
