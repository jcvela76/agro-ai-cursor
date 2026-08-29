import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import { authorizeWeatherAccess, authorizeWeatherPlusAccess } from "@/domain/auth/authorize-weather-access";
import type { ParcelRegistry } from "@/domain/parcel/types";
import type { DailyBriefingDeliveryPrefsRegistry } from "@/domain/report/daily-briefing-delivery";
import type { OrgMetadataStore } from "@/domain/workspace/types";
import { GetParcelSpectralZones } from "@/application/spectral/get-parcel-spectral-zones";
import {
  buildSpectralSceneUpsert,
  persistSpectralScene,
} from "@/domain/spectral/persist-spectral-scene";
import type { SpectralSceneRegistry } from "@/domain/spectral/scene-history";
import type { SpectralSource } from "@/domain/spectral/types";
import { VEGETATION_INDEX_ORDER } from "@/domain/spectral/vegetation-indices";

const CRON_USER_ID = "system:spectral-scene-cron";

export interface SpectralScenePollingParcelResult {
  parcelId: string;
  parcelName: string;
  persisted: boolean;
  acquisitionDate: string | null;
  acquiredAt: string | null;
  skippedReason?: string;
  error?: string;
  /** Count of zone snapshots upserted after a new scene (Perf-5). */
  zonesPrecomputed?: number;
}

export interface SpectralScenePollingOrgResult {
  orgId: string;
  parcels: SpectralScenePollingParcelResult[];
}

export interface RunSpectralScenePollingResult {
  polledAt: string;
  orgsProcessed: number;
  results: SpectralScenePollingOrgResult[];
}

function readEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export class RunSpectralScenePolling {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly spectralSource: SpectralSource,
    private readonly sceneHistory: SpectralSceneRegistry,
    private readonly metadataStore: OrgMetadataStore,
    private readonly briefingPrefs: DailyBriefingDeliveryPrefsRegistry,
    private readonly spectralZones: GetParcelSpectralZones,
    private readonly listOrgIds?: () => Promise<string[]>,
  ) {}

  async execute(options?: { now?: Date }): Promise<RunSpectralScenePollingResult> {
    const now = options?.now ?? new Date();
    const orgIds = await this.resolveOrgIds();
    const maxParcels = readEnvInt("SPECTRAL_CRON_MAX_PARCELS", 25);
    const results: SpectralScenePollingOrgResult[] = [];
    let parcelBudget = maxParcels;

    for (const orgId of orgIds) {
      if (parcelBudget <= 0) {
        break;
      }
      const orgResult = await this.processOrg(orgId, parcelBudget);
      parcelBudget -= orgResult.parcels.length;
      results.push(orgResult);
    }

    return {
      polledAt: now.toISOString(),
      orgsProcessed: results.length,
      results,
    };
  }

  private async resolveOrgIds(): Promise<string[]> {
    const fromEnv =
      process.env.SPECTRAL_CRON_ORG_IDS?.split(",")
        .map((value) => value.trim())
        .filter(Boolean) ?? [];
    const fromBriefing = (await this.briefingPrefs.listEnabled()).map((pref) => pref.orgId);
    const ids = new Set([...fromEnv, ...fromBriefing]);
    if (ids.size === 0 && this.listOrgIds) {
      for (const orgId of await this.listOrgIds()) {
        ids.add(orgId);
      }
    }
    return [...ids];
  }

  private async processOrg(
    orgId: string,
    parcelBudget: number,
  ): Promise<SpectralScenePollingOrgResult> {
    const settings = await this.metadataStore.getPublicMetadata(orgId);
    if (!settings.entitlements.includes("weather_plus")) {
      return {
        orgId,
        parcels: [
          {
            parcelId: "*",
            parcelName: "*",
            persisted: false,
            acquisitionDate: null,
            acquiredAt: null,
            skippedReason: "missing_plus_entitlement",
          },
        ],
      };
    }

    const authority: AccessSnapshot = {
      userId: CRON_USER_ID,
      orgId,
      isActiveMember: true,
      entitlements: settings.entitlements,
      authorizedParcelIds: settings.authorizedParcelIds,
    };

    const allParcels = (await this.parcels.listByOrgId(orgId)).filter((p) => p.geometry);
    const selected =
      settings.authorizedParcelIds.length > 0
        ? allParcels.filter((p) => settings.authorizedParcelIds.includes(p.id))
        : allParcels;

    const parcelResults: SpectralScenePollingParcelResult[] = [];

    for (const parcel of selected.slice(0, parcelBudget)) {
      const access = authorizeWeatherAccess(authority, parcel.id, parcel.orgId);
      if (!access.ok) {
        parcelResults.push({
          parcelId: parcel.id,
          parcelName: parcel.name,
          persisted: false,
          acquisitionDate: null,
          acquiredAt: null,
          skippedReason: "unauthorized_parcel",
        });
        continue;
      }

      if (!authorizeWeatherPlusAccess(authority)) {
        parcelResults.push({
          parcelId: parcel.id,
          parcelName: parcel.name,
          persisted: false,
          acquisitionDate: null,
          acquiredAt: null,
          skippedReason: "missing_plus_entitlement",
        });
        continue;
      }

      try {
        const indices = await this.spectralSource.getVegetationIndices(parcel.id, {
          latitude: parcel.latitude,
          longitude: parcel.longitude,
          geometry: parcel.geometry,
          timezone: parcel.timezone,
        });
        if (!indices.ok) {
          parcelResults.push({
            parcelId: parcel.id,
            parcelName: parcel.name,
            persisted: false,
            acquisitionDate: null,
            acquiredAt: null,
            skippedReason: indices.reason,
            error: indices.message,
          });
          continue;
        }

        const persisted = await persistSpectralScene(
          this.sceneHistory,
          buildSpectralSceneUpsert(parcel.orgId, parcel.id, indices.data),
          "new_scene_only",
        );

        let zonesPrecomputed: number | undefined;
        if (persisted.persisted) {
          zonesPrecomputed = await this.precomputeZones({
            authority,
            parcelId: parcel.id,
            acquiredAt: indices.data.evidence.acquiredAt,
            sourceId: indices.data.evidence.sourceId,
            meansByIndex: new Map(
              indices.data.indices.map((item) => [item.id, item.value] as const),
            ),
          });
        }

        parcelResults.push({
          parcelId: parcel.id,
          parcelName: parcel.name,
          persisted: persisted.persisted,
          acquisitionDate: indices.data.acquisitionDate,
          acquiredAt: indices.data.evidence.acquiredAt,
          skippedReason: persisted.skippedReason,
          zonesPrecomputed,
        });
      } catch (error) {
        parcelResults.push({
          parcelId: parcel.id,
          parcelName: parcel.name,
          persisted: false,
          acquisitionDate: null,
          acquiredAt: null,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { orgId, parcels: parcelResults };
  }

  private async precomputeZones(input: {
    authority: AccessSnapshot;
    parcelId: string;
    acquiredAt: string;
    sourceId: string;
    meansByIndex: Map<string, number | null>;
  }): Promise<number> {
    let okCount = 0;
    for (const indexId of VEGETATION_INDEX_ORDER) {
      try {
        const result = await this.spectralZones.execute({
          authority: input.authority,
          parcelId: input.parcelId,
          indexId,
          acquiredAt: input.acquiredAt,
          parcelMean: input.meansByIndex.get(indexId) ?? null,
          sourceId: input.sourceId,
        });
        if (result.ok) {
          okCount += 1;
        } else {
          console.warn(
            `spectral zone precompute failed parcel=${input.parcelId} index=${indexId}: ${result.message}`,
          );
        }
      } catch (error) {
        console.warn(
          `spectral zone precompute error parcel=${input.parcelId} index=${indexId}`,
          error,
        );
      }
    }
    return okCount;
  }
}
