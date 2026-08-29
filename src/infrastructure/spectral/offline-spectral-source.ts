import { computeVegetationIndices } from "@/domain/spectral/vegetation-indices";
import type {
  ParcelVegetationIndices,
  SpectralEvidence,
  SpectralLocationHint,
  SpectralReflectanceBands,
  SpectralResult,
  SpectralSource,
} from "@/domain/spectral/types";
import { resolveOfflineFixtureParcelId } from "@/infrastructure/fixtures/resolve-offline-fixture-parcel-id";
import reflectanceFixtures from "@/infrastructure/fixtures/spectral-reflectance.json";
import syntheticParcels from "@/infrastructure/fixtures/synthetic-parcels.json";

interface ReflectanceFixture {
  parcelId: string;
  acquisitionDate: string;
  bands: SpectralReflectanceBands;
  evidence: SpectralEvidence;
}

function coordKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
}

function buildFixtureIndex(fixtures: ReflectanceFixture[]) {
  const byParcelId = new Map<string, ReflectanceFixture>();
  const byCoords = new Map<string, ReflectanceFixture>();

  for (const fixture of fixtures) {
    byParcelId.set(fixture.parcelId, fixture);
    const { latitude, longitude } = fixture.evidence.spatialScope;
    byCoords.set(coordKey(latitude, longitude), fixture);
  }

  for (const parcel of syntheticParcels) {
    const canonicalId = resolveOfflineFixtureParcelId(parcel.id);
    const fixture = byParcelId.get(canonicalId);
    if (fixture) {
      byParcelId.set(parcel.id, fixture);
    }
    const coordFixture = byCoords.get(coordKey(parcel.latitude, parcel.longitude));
    if (coordFixture) {
      byParcelId.set(parcel.id, coordFixture);
    }
  }

  return { byParcelId, byCoords };
}

export class OfflineSpectralSource implements SpectralSource {
  private readonly byParcelId: Map<string, ReflectanceFixture>;
  private readonly byCoords: Map<string, ReflectanceFixture>;

  constructor(fixtures: ReflectanceFixture[] = reflectanceFixtures as ReflectanceFixture[]) {
    const index = buildFixtureIndex(fixtures);
    this.byParcelId = index.byParcelId;
    this.byCoords = index.byCoords;
  }

  async getVegetationIndices(
    parcelId: string,
    location?: SpectralLocationHint,
  ): Promise<SpectralResult<ParcelVegetationIndices>> {
    const fixture =
      this.byParcelId.get(parcelId) ??
      this.byParcelId.get(resolveOfflineFixtureParcelId(parcelId)) ??
      (location ? this.byCoords.get(coordKey(location.latitude, location.longitude)) : undefined);

    if (!fixture) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No hay datos espectrales offline para esta parcela.",
      };
    }

    if (fixture.evidence.freshnessStatus === "stale") {
      return {
        ok: false,
        reason: "stale",
        message: "La escena espectral ya no cumple la política de frescura.",
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

  async listVegetationIndexScenes(
    parcelId: string,
    location: SpectralLocationHint,
    options?: { days?: number },
  ): Promise<SpectralResult<ParcelVegetationIndices[]>> {
    const fixture =
      this.byParcelId.get(parcelId) ??
      this.byParcelId.get(resolveOfflineFixtureParcelId(parcelId)) ??
      this.byCoords.get(coordKey(location.latitude, location.longitude));

    if (!fixture) {
      return {
        ok: false,
        reason: "unavailable",
        message: "No hay datos espectrales offline para esta parcela.",
      };
    }

    const days = Math.min(Math.max(options?.days ?? 30, 1), 90);
    const baseDate = new Date(`${fixture.acquisitionDate}T12:00:00Z`);
    const offsets = [0, 7, 14, 21].filter((offset) => offset < days);

    const scenes = offsets
      .map((offsetDays) => {
        const date = new Date(baseDate.getTime() - offsetDays * 24 * 60 * 60 * 1000);
        const acquisitionDate = date.toISOString().slice(0, 10);
        const acquiredAt = `${acquisitionDate}T10:30:00-05:00`;
        const scale = 1 - offsetDays * 0.02;
        const bands: SpectralReflectanceBands = {
          blue: fixture.bands.blue * scale,
          green: fixture.bands.green * scale,
          red: fixture.bands.red * scale,
          redEdge: fixture.bands.redEdge * scale,
          nir: fixture.bands.nir * scale,
          swir: fixture.bands.swir * scale,
          swir2: fixture.bands.swir2 * scale,
        };

        return {
          kind: "vegetation_indices" as const,
          acquisitionDate,
          indices: computeVegetationIndices(bands),
          evidence: {
            ...fixture.evidence,
            acquiredAt,
            freshnessStatus: offsetDays <= 14 ? ("fresh" as const) : ("stale" as const),
          },
        };
      })
      .sort((a, b) => a.evidence.acquiredAt.localeCompare(b.evidence.acquiredAt));

    return { ok: true, data: scenes };
  }
}
