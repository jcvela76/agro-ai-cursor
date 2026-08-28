import { areaShares, classifyRelativeTiers } from "@/domain/spectral/classify-zones";
import { compassLabel, partitionParcelZones } from "@/domain/spectral/partition-zones";
import type { SpectralZone, SpectralZoneTier } from "@/domain/spectral/types";
import type { ParcelGeometry } from "@/domain/parcel/types";

export function buildSpectralZones(input: {
  geometry: ParcelGeometry;
  valuesByCellId: Map<string, number | null>;
  gridSize?: number;
}): SpectralZone[] {
  const cells = partitionParcelZones(input.geometry, input.gridSize);
  if (cells.length === 0) {
    return [];
  }

  const ringCentroid = cells.reduce(
    (acc, cell) => ({
      longitude: acc.longitude + cell.centroid.longitude / cells.length,
      latitude: acc.latitude + cell.centroid.latitude / cells.length,
    }),
    { longitude: 0, latitude: 0 },
  );

  const values = cells.map((cell) => input.valuesByCellId.get(cell.id) ?? null);
  const tiers = classifyRelativeTiers(values);
  const shares = areaShares(cells.map((c) => c.areaDeg2));

  return cells.map((cell, i) => {
    const tier: SpectralZoneTier = tiers[i] ?? "mid";
    const compass = compassLabel(cell.centroid, ringCentroid);
    return {
      id: cell.id,
      label: compass,
      tier,
      value: values[i] ?? null,
      areaShare: shares[i] ?? 0,
      geometry: cell.geometry,
      centroid: cell.centroid,
    };
  });
}
