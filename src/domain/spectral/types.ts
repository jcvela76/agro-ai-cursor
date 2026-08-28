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

export interface SpectralLegendStop {
  value: number;
  color: string;
}

export interface SpectralLegend {
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
  stops: SpectralLegendStop[];
}

export interface SpectralRasterOverlay {
  imageDataUrl: string;
  /** MapLibre image corners: NW, NE, SE, SW (lng, lat). */
  coordinates: [
    [number, number],
    [number, number],
    [number, number],
    [number, number],
  ];
  width: number;
  height: number;
}

export interface ParcelSpectralOverlay {
  kind: "spectral_overlay";
  indexId: VegetationIndexId;
  label: string;
  value: number | null;
  legend: SpectralLegend;
  /** Synthetic point grid (offline / fallback). Empty when raster is present. */
  grid: import("geojson").FeatureCollection<
    import("geojson").Point,
    { value: number }
  >;
  /** Live CDSE Process API PNG when available. */
  raster?: SpectralRasterOverlay;
  rendering: "synthetic_grid" | "sentinel_raster";
  evidence?: SpectralEvidence;
}

export type SpectralResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: SpectralLimitationReason; message: string };

export interface SpectralLocationHint {
  latitude: number;
  longitude: number;
  /** Parcel polygon for live AOI; offline adapters ignore this. */
  geometry?: import("@/domain/parcel/types").ParcelGeometry | null;
  timezone?: string;
}

export interface SpectralIndexOverlayRequest {
  parcelId: string;
  indexId: VegetationIndexId;
  geometry: import("@/domain/parcel/types").ParcelGeometry;
  /** Prefer scene day from indices evidence (YYYY-MM-DD or ISO). */
  acquiredAt: string;
  maxCloudCoverage?: number;
}

export interface SpectralSource {
  getVegetationIndices(
    parcelId: string,
    location?: SpectralLocationHint,
  ): Promise<SpectralResult<ParcelVegetationIndices>>;
  /** Optional live raster overlay (CDSE Process API). */
  getIndexOverlay?(
    request: SpectralIndexOverlayRequest,
  ): Promise<SpectralResult<SpectralRasterOverlay>>;
}
