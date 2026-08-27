import type {
  CreateParcelInput,
  Parcel,
  ParcelRegistry,
  UpdateParcelInput,
} from "@/domain/parcel/types";
import syntheticParcels from "@/infrastructure/fixtures/synthetic-parcels.json";

export class SyntheticParcelRegistry implements ParcelRegistry {
  private readonly parcels: Map<string, Parcel>;

  constructor(parcels: Parcel[] = syntheticParcels as Parcel[]) {
    this.parcels = new Map(parcels.map((p) => [p.id, { ...p, geometry: p.geometry ?? null }]));
  }

  async getParcel(parcelId: string): Promise<Parcel | undefined> {
    const parcel = this.parcels.get(parcelId);
    return parcel ? { ...parcel } : undefined;
  }

  async listByOrgId(orgId: string): Promise<Parcel[]> {
    return [...this.parcels.values()]
      .filter((p) => p.orgId === orgId)
      .map((p) => ({ ...p }));
  }

  async create(input: CreateParcelInput): Promise<Parcel> {
    const parcel: Parcel = { ...input };
    this.parcels.set(parcel.id, parcel);
    return { ...parcel };
  }

  async update(parcelId: string, input: UpdateParcelInput): Promise<Parcel | undefined> {
    const existing = this.parcels.get(parcelId);
    if (!existing) {
      return undefined;
    }
    const updated: Parcel = { ...existing, ...input };
    this.parcels.set(parcelId, updated);
    return { ...updated };
  }

  async delete(parcelId: string): Promise<boolean> {
    return this.parcels.delete(parcelId);
  }
}
