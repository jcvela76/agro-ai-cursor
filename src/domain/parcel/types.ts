export interface Parcel {
  id: string;
  orgId: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface ParcelRegistry {
  getParcel(parcelId: string): Parcel | undefined;
}
