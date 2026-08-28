import type { ParcelGeometry } from "@/domain/parcel/types";
import { computeVegetationIndices } from "@/domain/spectral/vegetation-indices";
import type {
  ParcelVegetationIndices,
  SpectralLocationHint,
  SpectralReflectanceBands,
  SpectralResult,
  SpectralSource,
} from "@/domain/spectral/types";
import { CdseTokenProvider, type FetchFn } from "@/infrastructure/spectral/cdse-auth";
import { SENTINEL2_L2A_BAND_MEAN_EVALSCRIPT } from "@/infrastructure/spectral/sentinel-hub-evalscript";

export const SENTINEL_HUB_SOURCE_ID = "sentinel-hub-cdse";
export const SENTINEL_HUB_SOURCE_LABEL = "Sentinel Hub (CDSE) — Sentinel-2 L2A";

export const DEFAULT_CDSE_STATISTICS_URL =
  "https://sh.dataspace.copernicus.eu/api/v1/statistics";

const BAND_KEYS = ["blue", "green", "red", "redEdge", "nir", "swir", "swir2"] as const;

interface BandStats {
  mean?: number;
  sampleCount?: number;
  noDataCount?: number;
}

interface StatsInterval {
  interval: { from: string; to: string };
  outputs?: {
    bands?: {
      bands?: Record<string, { stats?: BandStats }>;
    };
  };
}

interface StatsResponse {
  status?: string;
  data?: StatsInterval[];
}

export interface SentinelHubSpectralSourceOptions {
  clientId?: string;
  clientSecret?: string;
  fetchFn?: FetchFn;
  tokenProvider?: CdseTokenProvider;
  statisticsUrl?: string;
  /** Search window for scenes (days). Coastal fog may need >14. */
  lookbackDays?: number;
  /** Age threshold for evidence.freshnessStatus === "fresh". */
  freshnessMaxDays?: number;
  maxCloudCoverage?: number;
  now?: () => Date;
}

function readEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function toIsoDayStart(date: Date): string {
  return date.toISOString().slice(0, 10) + "T00:00:00Z";
}

function toIsoDayEnd(date: Date): string {
  return date.toISOString().slice(0, 10) + "T23:59:59Z";
}

function daysBetween(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24);
}

function pointBufferGeometry(latitude: number, longitude: number): ParcelGeometry {
  // ~110 m half-side at equator; enough for Statistical API AOI when polygon missing.
  const d = 0.001;
  return {
    type: "Polygon",
    coordinates: [
      [
        [longitude - d, latitude - d],
        [longitude + d, latitude - d],
        [longitude + d, latitude + d],
        [longitude - d, latitude + d],
        [longitude - d, latitude - d],
      ],
    ],
  };
}

function resolveGeometry(location?: SpectralLocationHint): ParcelGeometry | null {
  if (location?.geometry) {
    return location.geometry;
  }
  if (location) {
    return pointBufferGeometry(location.latitude, location.longitude);
  }
  return null;
}

function extractMeans(interval: StatsInterval): SpectralReflectanceBands | null {
  const bandStats = interval.outputs?.bands?.bands;
  if (!bandStats) return null;

  const means: Partial<SpectralReflectanceBands> = {};
  for (const key of BAND_KEYS) {
    const stats = bandStats[key]?.stats;
    if (!stats || typeof stats.mean !== "number") return null;
    const sampleCount = stats.sampleCount ?? 0;
    const noDataCount = stats.noDataCount ?? 0;
    if (sampleCount <= noDataCount) return null;
    means[key] = stats.mean;
  }

  return means as SpectralReflectanceBands;
}

function pickLatestValidInterval(intervals: StatsInterval[]): {
  interval: StatsInterval;
  bands: SpectralReflectanceBands;
} | null {
  for (let i = intervals.length - 1; i >= 0; i -= 1) {
    const interval = intervals[i];
    const bands = extractMeans(interval);
    if (bands) {
      return { interval, bands };
    }
  }
  return null;
}

/**
 * Live spectral adapter via Copernicus Data Space (Sentinel Hub Statistical API).
 * Requires SENTINEL_CLIENT_ID + SENTINEL_CLIENT_SECRET (OAuth client credentials).
 */
export class SentinelHubSpectralSource implements SpectralSource {
  private readonly tokenProvider: CdseTokenProvider;
  private readonly fetchFn: FetchFn;
  private readonly statisticsUrl: string;
  private readonly lookbackDays: number;
  private readonly freshnessMaxDays: number;
  private readonly maxCloudCoverage: number;
  private readonly now: () => Date;

  constructor(options: SentinelHubSpectralSourceOptions = {}) {
    const clientId = options.clientId ?? process.env.SENTINEL_CLIENT_ID ?? "";
    const clientSecret = options.clientSecret ?? process.env.SENTINEL_CLIENT_SECRET ?? "";
    this.fetchFn = options.fetchFn ?? fetch;
    this.tokenProvider =
      options.tokenProvider ??
      new CdseTokenProvider(clientId, clientSecret, this.fetchFn);
    this.statisticsUrl =
      options.statisticsUrl ??
      process.env.CDSE_STATISTICS_URL ??
      DEFAULT_CDSE_STATISTICS_URL;
    this.lookbackDays = options.lookbackDays ?? readEnvInt("SPECTRAL_LOOKBACK_DAYS", 30);
    this.freshnessMaxDays =
      options.freshnessMaxDays ?? readEnvInt("SPECTRAL_FRESHNESS_DAYS", 14);
    this.maxCloudCoverage =
      options.maxCloudCoverage ?? readEnvInt("SPECTRAL_MAX_CLOUD_COVERAGE", 80);
    this.now = options.now ?? (() => new Date());
  }

  async getVegetationIndices(
    parcelId: string,
    location?: SpectralLocationHint,
  ): Promise<SpectralResult<ParcelVegetationIndices>> {
    const geometry = resolveGeometry(location);
    if (!geometry || !location) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Spectral live requires parcel coordinates or polygon.",
      };
    }

    const end = this.now();
    const start = new Date(end.getTime() - this.lookbackDays * 24 * 60 * 60 * 1000);
    const timeRange = {
      from: toIsoDayStart(start),
      to: toIsoDayEnd(end),
    };

    const requestBody = {
      input: {
        bounds: {
          geometry,
          properties: {
            crs: "http://www.opengis.net/def/crs/EPSG/0/4326",
          },
        },
        data: [
          {
            type: "sentinel-2-l2a",
            dataFilter: {
              mosaickingOrder: "mostRecent",
              maxCloudCoverage: this.maxCloudCoverage,
            },
          },
        ],
      },
      aggregation: {
        timeRange,
        aggregationInterval: {
          of: "P5D",
          lastIntervalBehavior: "SHORTEN",
        },
        width: 64,
        height: 64,
        evalscript: SENTINEL2_L2A_BAND_MEAN_EVALSCRIPT,
      },
    };

    let payload: StatsResponse;
    try {
      const token = await this.tokenProvider.getAccessToken();
      const response = await this.fetchFn(this.statisticsUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        return {
          ok: false,
          reason: "internal_error",
          message: "Spectral provider request failed.",
        };
      }
      payload = (await response.json()) as StatsResponse;
    } catch {
      return {
        ok: false,
        reason: "internal_error",
        message: "Spectral provider request failed.",
      };
    }

    const intervals = payload.data ?? [];
    const picked = pickLatestValidInterval(intervals);
    if (!picked) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No hay escena Sentinel-2 L2A válida en la ventana configurada.",
      };
    }

    const acquiredAt = picked.interval.interval.from;
    const acquiredDate = new Date(acquiredAt);
    const ageDays = daysBetween(end, acquiredDate);
    const freshnessStatus = ageDays <= this.freshnessMaxDays ? "fresh" : "stale";
    const timezone = location.timezone ?? "America/Lima";
    const acquisitionDate = acquiredAt.slice(0, 10);

    return {
      ok: true,
      data: {
        kind: "vegetation_indices",
        acquisitionDate,
        indices: computeVegetationIndices(picked.bands),
        evidence: {
          sourceId: SENTINEL_HUB_SOURCE_ID,
          sourceLabel: SENTINEL_HUB_SOURCE_LABEL,
          acquiredAt,
          timezone,
          spatialScope: {
            kind: "point",
            latitude: location.latitude,
            longitude: location.longitude,
            label: parcelId,
          },
          freshnessStatus,
          freshnessPolicy: `cdse_s2_l2a_lookback_${this.lookbackDays}d_fresh_${this.freshnessMaxDays}d_cloud_${this.maxCloudCoverage}`,
          satelliteMission: "Sentinel-2",
          processingLevel: "L2A",
        },
      },
    };
  }
}
