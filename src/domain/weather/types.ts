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

/** WQ-11: deterministic 30-day precipitation sum (Plus). */
export interface WeatherRainfall30d {
  kind: "rainfall_30d";
  totalPrecipitationMm: number;
  daysIncluded: number;
  periodStart: string;
  periodEnd: string;
  evidence: WeatherEvidence;
}

/** WQ-12: campaign vs reference precipitation comparison (Plus). */
export interface WeatherRainfallPeriodSummary {
  totalPrecipitationMm: number;
  daysIncluded: number;
  periodStart: string;
  periodEnd: string;
}

export interface WeatherRainfallCampaignComparison {
  kind: "rainfall_campaign_comparison";
  comparisonMethodId: string;
  comparisonMethodLabel: string;
  campaign: WeatherRainfallPeriodSummary;
  reference: WeatherRainfallPeriodSummary;
  deltaMm: number;
  deltaPercent: number | null;
  evidence: WeatherEvidence;
}

export type WeatherResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: WeatherLimitationReason; message: string };

export interface WeatherSource {
  getObservation(parcelId: string): Promise<WeatherResult<WeatherObservation>>;
  getForecast(parcelId: string): Promise<WeatherResult<WeatherForecast>>;
  getRainfall30d(parcelId: string): Promise<WeatherResult<WeatherRainfall30d>>;
  getRainfallCampaignComparison(
    parcelId: string,
  ): Promise<WeatherResult<WeatherRainfallCampaignComparison>>;
}
