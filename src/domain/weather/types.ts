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
  /** Relative humidity at 2 m (%). Null if provider fill/missing. */
  relativeHumidityPercent: number | null;
  /** Wind speed at 2 m (m/s). Null if provider fill/missing. */
  windSpeedMetersPerSecond: number | null;
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

/** Campaign window for Plus aggregates (GDD / ET0 / lluvia campaña). */
export type WeatherCampaignSource = "sowing" | "calendar_ytd";

export interface WeatherCampaignQuery {
  startDate: string;
  endDate: string;
  source: WeatherCampaignSource;
  /** GDD base °C (ignored by ET0 / rainfall). */
  baseTempCelsius?: number;
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
  campaignSource: WeatherCampaignSource;
  campaign: WeatherRainfallPeriodSummary;
  reference: WeatherRainfallPeriodSummary;
  deltaMm: number;
  deltaPercent: number | null;
  evidence: WeatherEvidence;
}

/** WQ-13: forecast days ranked by lowest precipitation probability (Plus). */
export interface WeatherLowRainDay {
  date: string;
  precipitationProbability: number;
  precipitationMm: number;
  rank: number;
}

export interface WeatherLowRainDays {
  kind: "low_rain_days";
  rankingMethodId: string;
  rankingMethodLabel: string;
  horizonStart: string;
  horizonEnd: string;
  daysInHorizon: number;
  daysWithProbability: number;
  days: WeatherLowRainDay[];
  evidence: WeatherEvidence;
}

/** WQ-14: growing degree days accumulation (Plus). */
export interface WeatherGdd {
  kind: "gdd";
  calculationMethodId: string;
  calculationMethodLabel: string;
  baseTempCelsius: number;
  campaignSource: WeatherCampaignSource;
  totalGdd: number;
  daysIncluded: number;
  periodStart: string;
  periodEnd: string;
  evidence: WeatherEvidence;
}

/** WQ-15: reference evapotranspiration accumulation (Plus). */
export interface WeatherEt0 {
  kind: "et0";
  calculationMethodId: string;
  calculationMethodLabel: string;
  campaignSource: WeatherCampaignSource;
  totalEt0Mm: number;
  daysIncluded: number;
  periodStart: string;
  periodEnd: string;
  /** Orientative crop ET (Kc × ET0) when profile has crop; not an irrigation dose. */
  etcEstimateMm?: number | null;
  kcUsed?: number | null;
  kcStage?: string | null;
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
    query?: WeatherCampaignQuery,
  ): Promise<WeatherResult<WeatherRainfallCampaignComparison>>;
  getLowRainDays(parcelId: string): Promise<WeatherResult<WeatherLowRainDays>>;
  getGdd(
    parcelId: string,
    query?: WeatherCampaignQuery,
  ): Promise<WeatherResult<WeatherGdd>>;
  getEt0(
    parcelId: string,
    query?: WeatherCampaignQuery,
  ): Promise<WeatherResult<WeatherEt0>>;
}
