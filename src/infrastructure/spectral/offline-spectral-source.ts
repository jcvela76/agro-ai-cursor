import { computeVegetationIndices } from "@/domain/spectral/vegetation-indices";
import type {
  ParcelVegetationIndices,
  SpectralEvidence,
  SpectralReflectanceBands,
  SpectralResult,
  SpectralSource,
} from "@/domain/spectral/types";
import reflectanceFixtures from "@/infrastructure/fixtures/spectral-reflectance.json";

interface ReflectanceFixture {
  parcelId: string;
  acquisitionDate: string;
  bands: SpectralReflectanceBands;
  evidence: SpectralEvidence;
}

export class OfflineSpectralSource implements SpectralSource {
  private readonly fixtures: Map<string, ReflectanceFixture>;

  constructor(fixtures: ReflectanceFixture[] = reflectanceFixtures as ReflectanceFixture[]) {
    this.fixtures = new Map(fixtures.map((fixture) => [fixture.parcelId, fixture]));
  }

  async getVegetationIndices(parcelId: string): Promise<SpectralResult<ParcelVegetationIndices>> {
    const fixture = this.fixtures.get(parcelId);
    if (!fixture) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No spectral fixture exists for this parcel.",
      };
    }

    if (fixture.evidence.freshnessStatus === "stale") {
      return {
        ok: false,
        reason: "stale",
        message: "The latest spectral scene is no longer sufficiently fresh.",
      };
    }

    return {
      ok: true,
      data: {
        kind: "vegetation_indices",
        acquisitionDate: fixture.acquisitionDate,
        indices: computeVegetationIndices(fixture.bands),
        evidence: fixture.evidence,
      },
    };
  }
}
