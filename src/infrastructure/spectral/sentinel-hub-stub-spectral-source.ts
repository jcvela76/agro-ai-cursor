import type {
  ParcelVegetationIndices,
  SpectralEvidence,
  SpectralLocationHint,
  SpectralResult,
  SpectralSource,
} from "@/domain/spectral/types";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";

export const SENTINEL_HUB_STUB_SOURCE_ID = "sentinel-hub-stub";
export const SENTINEL_HUB_STUB_SOURCE_LABEL =
  "Sentinel Hub (stub offline — no live API; contract pending)";

function remapEvidence(evidence: SpectralEvidence): SpectralEvidence {
  return {
    ...evidence,
    sourceId: SENTINEL_HUB_STUB_SOURCE_ID,
    sourceLabel: SENTINEL_HUB_STUB_SOURCE_LABEL,
    freshnessPolicy: "sentinel_hub_stub_synthetic",
    satelliteMission: evidence.satelliteMission ?? "Sentinel-2",
    processingLevel: evidence.processingLevel ?? "L2A",
  };
}

/**
 * Offline Plus spectral stub. Uses synthetic fixtures with Sentinel Hub provenance labels.
 * Does not call Sentinel Hub or any network. Live path: `SPECTRAL_SOURCE=sentinel_hub` (CDSE).
 */
export class SentinelHubStubSpectralSource implements SpectralSource {
  constructor(private readonly inner: SpectralSource = new OfflineSpectralSource()) {}

  async getVegetationIndices(
    parcelId: string,
    location?: SpectralLocationHint,
  ): Promise<SpectralResult<ParcelVegetationIndices>> {
    const result = await this.inner.getVegetationIndices(parcelId, location);
    if (!result.ok) {
      return result;
    }
    return {
      ok: true,
      data: {
        ...result.data,
        evidence: remapEvidence(result.data.evidence),
      },
    };
  }

  async listVegetationIndexScenes(
    parcelId: string,
    location: SpectralLocationHint,
    options?: { days?: number },
  ): Promise<SpectralResult<ParcelVegetationIndices[]>> {
    if (!this.inner.listVegetationIndexScenes) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Historical spectral scenes are not available from this provider.",
      };
    }

    const result = await this.inner.listVegetationIndexScenes(parcelId, location, options);
    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      data: result.data.map((scene) => ({
        ...scene,
        evidence: remapEvidence(scene.evidence),
      })),
    };
  }
}
