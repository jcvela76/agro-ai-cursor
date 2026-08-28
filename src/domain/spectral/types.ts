export type SpectralFreshnessStatus = "fresh" | "stale" | "unknown";

export type SpectralLimitationReason =
  | "unavailable"
  | "stale"
  | "unsupported_range"
  | "internal_error";

export interface SpectralSpatialScope {
  kind: "point";
  latitude: number;
  longitude: number;
  label: string;
}

export interface SpectralEvidence {
  sourceId: string;
  sourceLabel: string;
  acquiredAt: string;
  timezone: string;
  spatialScope: SpectralSpatialScope;
  freshnessStatus: SpectralFreshnessStatus;
  freshnessPolicy: string;
  satelliteMission?: string;
  processingLevel?: string;
}

/** Surface reflectance (0–1) from multispectral bands — offline/live adapters supply these. */
export interface SpectralReflectanceBands {
  blue: number;
  green: number;
  red: number;
  redEdge: number;
  nir: number;
  swir: number;
  swir2: number;
}

export type VegetationIndexId =
  | "ndre"
  | "evi"
  | "savi"
  | "msavi"
  | "gndvi"
  | "ndwi"
  | "ndmi"
  | "nbr";

export interface VegetationIndexReading {
  id: VegetationIndexId;
  label: string;
  description: string;
  methodId: string;
  value: number | null;
}

export interface ParcelVegetationIndices {
  kind: "vegetation_indices";
  acquisitionDate: string;
  indices: VegetationIndexReading[];
  evidence: SpectralEvidence;
}

export type SpectralResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: SpectralLimitationReason; message: string };

export interface SpectralSource {
  getVegetationIndices(parcelId: string): Promise<SpectralResult<ParcelVegetationIndices>>;
}
