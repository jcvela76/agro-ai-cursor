export type WeatherFreshnessStatus = "fresh" | "stale" | "unknown";

export type WeatherLimitationReason =
  | "unavailable"
  | "stale"
  | "unsupported_range"
  | "internal_error";

export interface SpatialScope {
  kind: "point";
  latitude: number;
  longitude: number;
  label: string;
}

export interface WeatherEvidence {
  sourceId: string;
  sourceLabel: string;
  observedAt?: string;
  emittedAt?: string;
  validFrom?: string;
  validTo?: string;
  timezone: string;
  spatialScope: SpatialScope;
  freshnessStatus: WeatherFreshnessStatus;
  freshnessPolicy: string;
}

export interface WeatherObservation {
  kind: "observation";
  temperatureCelsius: number;
  precipitationMm: number;
  evidence: WeatherEvidence;
}

export interface WeatherForecastDay {
  date: string;
  tempMinCelsius: number;
  tempMaxCelsius: number;
  precipitationMm: number;
  precipitationProbability?: number;
}

export interface WeatherForecast {
  kind: "forecast";
  days: WeatherForecastDay[];
  evidence: WeatherEvidence;
}

export type WeatherResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: WeatherLimitationReason; message: string };

export interface WeatherSource {
  getObservation(parcelId: string): Promise<WeatherResult<WeatherObservation>>;
  getForecast(parcelId: string): Promise<WeatherResult<WeatherForecast>>;
}
