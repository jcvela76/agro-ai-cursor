import type { ParcelGeometry } from "@/domain/parcel/types";
import { buildSpectralZones } from "@/domain/spectral/build-spectral-zones";
import { partitionParcelZones } from "@/domain/spectral/partition-zones";
import {
  computeVegetationIndex,
  computeVegetationIndices,
} from "@/domain/spectral/vegetation-indices";
import type {
  ParcelVegetationIndices,
  SpectralIndexOverlayRequest,
  SpectralIndexZonesPayload,
  SpectralIndexZonesRequest,
  SpectralLocationHint,
  SpectralRasterOverlay,
  SpectralReflectanceBands,
  SpectralResult,
  SpectralSource,
} from "@/domain/spectral/types";
import {
  aggregateZoneRaster,
  decodeFloatTiff,
} from "@/infrastructure/spectral/aggregate-zone-raster";
import { CdseTokenProvider, type FetchFn } from "@/infrastructure/spectral/cdse-auth";
import { SENTINEL2_L2A_BAND_MEAN_EVALSCRIPT } from "@/infrastructure/spectral/sentinel-hub-evalscript";
import {
  bboxImageCoordinates,
  buildIndexFloatEvalscript,
  buildIndexRasterEvalscript,
  geometryBbox,
  rasterOutputSize,
} from "@/infrastructure/spectral/sentinel-hub-index-evalscript";
import { TtlCache } from "@/infrastructure/spectral/ttl-cache";

/** Coarse grid for zone Process raster (enough for 3×3 fishnet; cheaper than overlay 512). */
export const ZONE_RASTER_MAX_SIDE = 96;

export const SENTINEL_HUB_SOURCE_ID = "sentinel-hub-cdse";
export const SENTINEL_HUB_SOURCE_LABEL = "Sentinel Hub (CDSE) — Sentinel-2 L2A";

export const DEFAULT_CDSE_STATISTICS_URL =
  "https://sh.dataspace.copernicus.eu/api/v1/statistics";
export const DEFAULT_CDSE_PROCESS_URL =
  "https://sh.dataspace.copernicus.eu/api/v1/process";

/** Default 1h — CDSE scenes change slowly; avoids re-hitting stats on every index/overlay click. */
export const DEFAULT_SPECTRAL_CACHE_TTL_MS = 60 * 60 * 1000;

const BAND_KEYS = ["blue", "green", "red", "redEdge", "nir", "swir", "swir2"] as const;

/** Process-local cache shared across SentinelHubSpectralSource instances. */
const sharedIndicesCache = new TtlCache<SpectralResult<ParcelVegetationIndices>>();
const sharedRasterCache = new TtlCache<SpectralResult<SpectralRasterOverlay>>();
const sharedZonesCache = new TtlCache<SpectralResult<SpectralIndexZonesPayload>>();

export function clearSentinelHubSpectralCache(): void {
  sharedIndicesCache.clear();
  sharedRasterCache.clear();
  sharedZonesCache.clear();
}

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
  processUrl?: string;
  /** Search window for scenes (days). Coastal fog may need >14. */
  lookbackDays?: number;
  /** Age threshold for evidence.freshnessStatus === "fresh". */
  freshnessMaxDays?: number;
  maxCloudCoverage?: number;
  /** Cache successful CDSE results (ms). 0 disables. Default 1h. */
  cacheTtlMs?: number;
  cache?: TtlCache<SpectralResult<ParcelVegetationIndices>>;
  rasterCache?: TtlCache<SpectralResult<SpectralRasterOverlay>>;
  zonesCache?: TtlCache<SpectralResult<SpectralIndexZonesPayload>>;
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

function geometryCacheKey(geometry: ParcelGeometry): string {
  return JSON.stringify(geometry);
}

function buildCacheKey(
  parcelId: string,
  geometry: ParcelGeometry,
  lookbackDays: number,
  maxCloudCoverage: number,
): string {
  return `${parcelId}|${lookbackDays}|${maxCloudCoverage}|${geometryCacheKey(geometry)}`;
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

function listAllValidIntervals(intervals: StatsInterval[]): Array<{
  interval: StatsInterval;
  bands: SpectralReflectanceBands;
}> {
  const results: Array<{ interval: StatsInterval; bands: SpectralReflectanceBands }> = [];
  for (const interval of intervals) {
    const bands = extractMeans(interval);
    if (bands) {
      results.push({ interval, bands });
    }
  }
  return results;
}

function buildStatisticsRequestBody(input: {
  geometry: ParcelGeometry;
  timeRange: { from: string; to: string };
  maxCloudCoverage: number;
  aggregationInterval: string;
}): Record<string, unknown> {
  return {
    input: {
      bounds: {
        geometry: input.geometry,
        properties: {
          crs: "http://www.opengis.net/def/crs/EPSG/0/4326",
        },
      },
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: {
            mosaickingOrder: "mostRecent",
            maxCloudCoverage: input.maxCloudCoverage,
          },
        },
      ],
    },
    aggregation: {
      timeRange: input.timeRange,
      aggregationInterval: {
        of: input.aggregationInterval,
        lastIntervalBehavior: "SHORTEN",
      },
      width: 64,
      height: 64,
      evalscript: SENTINEL2_L2A_BAND_MEAN_EVALSCRIPT,
    },
  };
}

function mapIntervalToVegetationIndices(input: {
  parcelId: string;
  location: SpectralLocationHint;
  interval: StatsInterval;
  bands: SpectralReflectanceBands;
  end: Date;
  freshnessMaxDays: number;
  lookbackDays: number;
  maxCloudCoverage: number;
}): ParcelVegetationIndices {
  const acquiredAt = input.interval.interval.from;
  const acquiredDate = new Date(acquiredAt);
  const ageDays = daysBetween(input.end, acquiredDate);
  const freshnessStatus = ageDays <= input.freshnessMaxDays ? "fresh" : "stale";
  const timezone = input.location.timezone ?? "America/Lima";
  const acquisitionDate = acquiredAt.slice(0, 10);

  return {
    kind: "vegetation_indices",
    acquisitionDate,
    indices: computeVegetationIndices(input.bands),
    evidence: {
      sourceId: SENTINEL_HUB_SOURCE_ID,
      sourceLabel: SENTINEL_HUB_SOURCE_LABEL,
      acquiredAt,
      timezone,
      spatialScope: {
        kind: "point",
        latitude: input.location.latitude,
        longitude: input.location.longitude,
        label: input.parcelId,
      },
      freshnessStatus,
      freshnessPolicy: `cdse_s2_l2a_lookback_${input.lookbackDays}d_fresh_${input.freshnessMaxDays}d_cloud_${input.maxCloudCoverage}`,
      satelliteMission: "Sentinel-2",
      processingLevel: "L2A",
    },
  };
}

/**
 * Live spectral adapter via Copernicus Data Space (Sentinel Hub Statistical API).
 * Requires SENTINEL_CLIENT_ID + SENTINEL_CLIENT_SECRET (OAuth client credentials).
 */
export class SentinelHubSpectralSource implements SpectralSource {
  private readonly tokenProvider: CdseTokenProvider;
  private readonly fetchFn: FetchFn;
  private readonly statisticsUrl: string;
  private readonly processUrl: string;
  private readonly lookbackDays: number;
  private readonly freshnessMaxDays: number;
  private readonly maxCloudCoverage: number;
  private readonly cacheTtlMs: number;
  private readonly cache: TtlCache<SpectralResult<ParcelVegetationIndices>>;
  private readonly rasterCache: TtlCache<SpectralResult<SpectralRasterOverlay>>;
  private readonly zonesCache: TtlCache<SpectralResult<SpectralIndexZonesPayload>>;
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
    this.processUrl =
      options.processUrl ?? process.env.CDSE_PROCESS_URL ?? DEFAULT_CDSE_PROCESS_URL;
    this.lookbackDays = options.lookbackDays ?? readEnvInt("SPECTRAL_LOOKBACK_DAYS", 30);
    this.freshnessMaxDays =
      options.freshnessMaxDays ?? readEnvInt("SPECTRAL_FRESHNESS_DAYS", 14);
    this.maxCloudCoverage =
      options.maxCloudCoverage ?? readEnvInt("SPECTRAL_MAX_CLOUD_COVERAGE", 80);
    this.cacheTtlMs =
      options.cacheTtlMs ?? readEnvInt("SPECTRAL_CACHE_TTL_MS", DEFAULT_SPECTRAL_CACHE_TTL_MS);
    this.cache = options.cache ?? sharedIndicesCache;
    this.rasterCache = options.rasterCache ?? sharedRasterCache;
    this.zonesCache = options.zonesCache ?? sharedZonesCache;
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

    const cacheKey = buildCacheKey(
      parcelId,
      geometry,
      this.lookbackDays,
      this.maxCloudCoverage,
    );
    if (this.cacheTtlMs > 0) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const end = this.now();
    const start = new Date(end.getTime() - this.lookbackDays * 24 * 60 * 60 * 1000);
    const timeRange = {
      from: toIsoDayStart(start),
      to: toIsoDayEnd(end),
    };

    const payload = await this.fetchStatistics({
      geometry,
      timeRange,
      aggregationInterval: "P5D",
    });
    if (!payload.ok) {
      return payload;
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

    const result: SpectralResult<ParcelVegetationIndices> = {
      ok: true,
      data: mapIntervalToVegetationIndices({
        parcelId,
        location,
        interval: picked.interval,
        bands: picked.bands,
        end,
        freshnessMaxDays: this.freshnessMaxDays,
        lookbackDays: this.lookbackDays,
        maxCloudCoverage: this.maxCloudCoverage,
      }),
    };

    if (this.cacheTtlMs > 0) {
      this.cache.set(cacheKey, result, this.cacheTtlMs);
    }

    return result;
  }

  async listVegetationIndexScenes(
    parcelId: string,
    location: SpectralLocationHint,
    options?: { days?: number },
  ): Promise<SpectralResult<ParcelVegetationIndices[]>> {
    const geometry = resolveGeometry(location);
    if (!geometry) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Spectral live requires parcel coordinates or polygon.",
      };
    }

    const maxDays = readEnvInt("SPECTRAL_BACKFILL_MAX_DAYS", 90);
    const days = Math.min(Math.max(options?.days ?? this.lookbackDays, 1), maxDays);
    const end = this.now();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    const timeRange = {
      from: toIsoDayStart(start),
      to: toIsoDayEnd(end),
    };

    const payload = await this.fetchStatistics({
      geometry,
      timeRange,
      aggregationInterval: "P1D",
    });
    if (!payload.ok) {
      return payload;
    }

    const scenes = listAllValidIntervals(payload.data ?? [])
      .map((item) =>
        mapIntervalToVegetationIndices({
          parcelId,
          location,
          interval: item.interval,
          bands: item.bands,
          end,
          freshnessMaxDays: this.freshnessMaxDays,
          lookbackDays: days,
          maxCloudCoverage: this.maxCloudCoverage,
        }),
      )
      .sort((a, b) => a.evidence.acquiredAt.localeCompare(b.evidence.acquiredAt));

    if (scenes.length === 0) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No hay escenas Sentinel-2 L2A válidas en la ventana configurada.",
      };
    }

    return { ok: true, data: scenes };
  }

  private async fetchStatistics(input: {
    geometry: ParcelGeometry;
    timeRange: { from: string; to: string };
    aggregationInterval: string;
  }): Promise<SpectralResult<StatsInterval[]>> {
    const requestBody = buildStatisticsRequestBody({
      geometry: input.geometry,
      timeRange: input.timeRange,
      maxCloudCoverage: this.maxCloudCoverage,
      aggregationInterval: input.aggregationInterval,
    });

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
      const payload = (await response.json()) as StatsResponse;
      return { ok: true, data: payload.data ?? [] };
    } catch {
      return {
        ok: false,
        reason: "internal_error",
        message: "Spectral provider request failed.",
      };
    }
  }

  async getIndexOverlay(
    request: SpectralIndexOverlayRequest,
  ): Promise<SpectralResult<SpectralRasterOverlay>> {
    const day = request.acquiredAt.slice(0, 10);
    const cacheKey = `raster-v2|${request.parcelId}|${request.indexId}|${day}|${JSON.stringify(request.geometry)}`;
    if (this.cacheTtlMs > 0) {
      const cached = this.rasterCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const bbox = geometryBbox(request.geometry);
    if (!Number.isFinite(bbox.minLng) || bbox.maxLng <= bbox.minLng) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Parcel geometry is invalid for spectral overlay.",
      };
    }

    const { width, height } = rasterOutputSize(bbox);
    // Statistical intervals are P5D buckets; pinning Process to a single calendar day
    // often yields an empty (fully transparent) PNG. Cover the bucket + slack.
    const startMs = Date.parse(`${day}T00:00:00Z`);
    const timeFrom = Number.isFinite(startMs)
      ? new Date(startMs).toISOString().slice(0, 19) + "Z"
      : `${day}T00:00:00Z`;
    const timeTo = Number.isFinite(startMs)
      ? new Date(startMs + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) + "T23:59:59Z"
      : `${day}T23:59:59Z`;
    const maxCloud = request.maxCloudCoverage ?? this.maxCloudCoverage;

    const body = {
      input: {
        bounds: {
          geometry: request.geometry,
          properties: {
            crs: "http://www.opengis.net/def/crs/EPSG/0/4326",
          },
        },
        data: [
          {
            type: "sentinel-2-l2a",
            dataFilter: {
              timeRange: { from: timeFrom, to: timeTo },
              maxCloudCoverage: maxCloud,
              mosaickingOrder: "mostRecent",
            },
          },
        ],
      },
      output: {
        width,
        height,
        responses: [
          {
            identifier: "default",
            format: { type: "image/png" },
          },
        ],
      },
      evalscript: buildIndexRasterEvalscript(request.indexId),
    };

    try {
      const token = await this.tokenProvider.getAccessToken();
      const response = await this.fetchFn(this.processUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "image/png",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        return {
          ok: false,
          reason: "internal_error",
          message: "Spectral overlay provider request failed.",
        };
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength < 32) {
        return {
          ok: false,
          reason: "unavailable",
          message: "Spectral overlay returned an empty image.",
        };
      }

      const result: SpectralResult<SpectralRasterOverlay> = {
        ok: true,
        data: {
          imageDataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
          coordinates: bboxImageCoordinates(bbox),
          width,
          height,
        },
      };

      if (this.cacheTtlMs > 0) {
        this.rasterCache.set(cacheKey, result, this.cacheTtlMs);
      }
      return result;
    } catch {
      return {
        ok: false,
        reason: "internal_error",
        message: "Spectral overlay provider request failed.",
      };
    }
  }

  async getIndexZones(
    request: SpectralIndexZonesRequest,
  ): Promise<SpectralResult<SpectralIndexZonesPayload>> {
    const day = request.acquiredAt.slice(0, 10);
    const cacheKey = `zones-v2|${request.parcelId}|${request.indexId}|${day}|${JSON.stringify(request.geometry)}`;
    if (this.cacheTtlMs > 0) {
      const cached = this.zonesCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const cells = partitionParcelZones(request.geometry);
    if (cells.length === 0) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Parcel geometry is invalid for spectral zones.",
      };
    }

    const startMs = Date.parse(`${day}T00:00:00Z`);
    const timeFrom = Number.isFinite(startMs)
      ? new Date(startMs).toISOString().slice(0, 19) + "Z"
      : `${day}T00:00:00Z`;
    const timeTo = Number.isFinite(startMs)
      ? new Date(startMs + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) + "T23:59:59Z"
      : `${day}T23:59:59Z`;
    const maxCloud = request.maxCloudCoverage ?? this.maxCloudCoverage;

    let token: string;
    try {
      token = await this.tokenProvider.getAccessToken();
    } catch {
      return {
        ok: false,
        reason: "internal_error",
        message: "Spectral provider request failed.",
      };
    }

    const processValues = await this.fetchZoneMeansViaProcess({
      geometry: request.geometry,
      indexId: request.indexId,
      cells,
      timeFrom,
      timeTo,
      maxCloud,
      token,
    });

    let valuesByCellId = processValues;
    let computation: NonNullable<SpectralIndexZonesPayload["computation"]> = "process_raster";

    if (!valuesByCellId) {
      valuesByCellId = await this.fetchZoneMeansViaStatistical({
        cells,
        indexId: request.indexId,
        timeFrom,
        timeTo,
        maxCloud,
        token,
      });
      computation = "statistical_cells";
    }

    if (!valuesByCellId) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No hay estadísticas por zona para esta escena.",
      };
    }

    let validCount = 0;
    for (const value of valuesByCellId.values()) {
      if (value !== null) {
        validCount += 1;
      }
    }
    if (validCount === 0) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No hay estadísticas por zona para esta escena.",
      };
    }

    const zones = buildSpectralZones({
      geometry: request.geometry,
      valuesByCellId,
    });

    const result: SpectralResult<SpectralIndexZonesPayload> = {
      ok: true,
      data: {
        indexId: request.indexId,
        parcelMean: request.parcelMean,
        zones,
        computation,
      },
    };

    if (this.cacheTtlMs > 0) {
      this.zonesCache.set(cacheKey, result, this.cacheTtlMs);
    }
    return result;
  }

  private async fetchZoneMeansViaProcess(input: {
    geometry: ParcelGeometry;
    indexId: SpectralIndexZonesRequest["indexId"];
    cells: ReturnType<typeof partitionParcelZones>;
    timeFrom: string;
    timeTo: string;
    maxCloud: number;
    token: string;
  }): Promise<Map<string, number | null> | null> {
    const bbox = geometryBbox(input.geometry);
    if (!Number.isFinite(bbox.minLng) || bbox.maxLng <= bbox.minLng) {
      return null;
    }
    const { width, height } = rasterOutputSize(bbox, ZONE_RASTER_MAX_SIDE);
    const body = {
      input: {
        bounds: {
          geometry: input.geometry,
          properties: {
            crs: "http://www.opengis.net/def/crs/EPSG/0/4326",
          },
        },
        data: [
          {
            type: "sentinel-2-l2a",
            dataFilter: {
              timeRange: { from: input.timeFrom, to: input.timeTo },
              maxCloudCoverage: input.maxCloud,
              mosaickingOrder: "mostRecent",
            },
          },
        ],
      },
      output: {
        width,
        height,
        responses: [
          {
            identifier: "default",
            format: { type: "image/tiff" },
          },
        ],
      },
      evalscript: buildIndexFloatEvalscript(input.indexId),
    };

    try {
      const response = await this.fetchFn(this.processUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.token}`,
          "Content-Type": "application/json",
          Accept: "image/tiff",
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        return null;
      }
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength < 32) {
        return null;
      }
      const decoded = await decodeFloatTiff(buffer);
      if (!decoded) {
        return null;
      }
      const valuesByCellId = aggregateZoneRaster({
        values: decoded.values,
        width: decoded.width,
        height: decoded.height,
        bbox,
        cells: input.cells,
      });
      let valid = 0;
      for (const value of valuesByCellId.values()) {
        if (value !== null) {
          valid += 1;
        }
      }
      return valid > 0 ? valuesByCellId : null;
    } catch {
      return null;
    }
  }

  private async fetchZoneMeansViaStatistical(input: {
    cells: ReturnType<typeof partitionParcelZones>;
    indexId: SpectralIndexZonesRequest["indexId"];
    timeFrom: string;
    timeTo: string;
    maxCloud: number;
    token: string;
  }): Promise<Map<string, number | null> | null> {
    const settled = await Promise.all(
      input.cells.map(async (cell) => {
        const bands = await this.fetchBandMeansForGeometry({
          geometry: cell.geometry,
          timeFrom: input.timeFrom,
          timeTo: input.timeTo,
          maxCloud: input.maxCloud,
          token: input.token,
          width: 32,
          height: 32,
        });
        const value = bands ? computeVegetationIndex(input.indexId, bands) : null;
        return { id: cell.id, value };
      }),
    );

    const valuesByCellId = new Map<string, number | null>();
    let validCount = 0;
    for (const item of settled) {
      valuesByCellId.set(item.id, item.value);
      if (item.value !== null) {
        validCount += 1;
      }
    }
    return validCount > 0 ? valuesByCellId : null;
  }

  private async fetchBandMeansForGeometry(input: {
    geometry: ParcelGeometry;
    timeFrom: string;
    timeTo: string;
    maxCloud: number;
    token: string;
    width: number;
    height: number;
  }): Promise<SpectralReflectanceBands | null> {
    const requestBody = {
      input: {
        bounds: {
          geometry: input.geometry,
          properties: {
            crs: "http://www.opengis.net/def/crs/EPSG/0/4326",
          },
        },
        data: [
          {
            type: "sentinel-2-l2a",
            dataFilter: {
              mosaickingOrder: "mostRecent",
              maxCloudCoverage: input.maxCloud,
            },
          },
        ],
      },
      aggregation: {
        timeRange: { from: input.timeFrom, to: input.timeTo },
        aggregationInterval: {
          of: "P5D",
          lastIntervalBehavior: "SHORTEN",
        },
        width: input.width,
        height: input.height,
        evalscript: SENTINEL2_L2A_BAND_MEAN_EVALSCRIPT,
      },
    };

    try {
      const response = await this.fetchFn(this.statisticsUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        return null;
      }
      const payload = (await response.json()) as StatsResponse;
      const picked = pickLatestValidInterval(payload.data ?? []);
      return picked?.bands ?? null;
    } catch {
      return null;
    }
  }
}
