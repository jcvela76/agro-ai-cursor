export type ParcelPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

export type ParcelMultiPolygon = {
  type: "MultiPolygon";
  coordinates: number[][][][];
};

export type ParcelGeometry = ParcelPolygon | ParcelMultiPolygon;

export interface Parcel {
  id: string;
  orgId: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  geometry: ParcelGeometry | null;
}

export interface CreateParcelInput {
  id: string;
  orgId: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  geometry: ParcelGeometry;
}

export interface UpdateParcelInput {
  name?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  geometry?: ParcelGeometry;
}

export interface ParcelRegistry {
  getParcel(parcelId: string): Promise<Parcel | undefined>;
  listByOrgId(orgId: string): Promise<Parcel[]>;
  create(input: CreateParcelInput): Promise<Parcel>;
  update(parcelId: string, input: UpdateParcelInput): Promise<Parcel | undefined>;
  delete(parcelId: string): Promise<boolean>;
}
