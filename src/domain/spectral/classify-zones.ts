import type { SpectralZoneTier } from "@/domain/spectral/types";

/**
 * Relative tercile tiers across zone means (within-parcel, not absolute agronomic thresholds).
 * Assigns by rank: bottom ~1/3 low, top ~1/3 high, remainder mid.
 */
export function classifyRelativeTiers(values: Array<number | null>): SpectralZoneTier[] {
  const numeric = values
    .map((v, i) => ({ v, i }))
    .filter((item): item is { v: number; i: number } => item.v !== null && Number.isFinite(item.v));

  const tiers: SpectralZoneTier[] = values.map(() => "mid");
  if (numeric.length === 0) {
    return tiers;
  }
  if (numeric.length === 1) {
    tiers[numeric[0].i] = "mid";
    return tiers;
  }

  const sorted = [...numeric].sort((a, b) => a.v - b.v);
  if (numeric.length === 2) {
    tiers[sorted[0].i] = "low";
    tiers[sorted[1].i] = "high";
    return tiers;
  }

  const n = sorted.length;
  const lowCount = Math.max(1, Math.floor(n / 3));
  const highCount = Math.max(1, Math.floor(n / 3));
  for (let i = 0; i < lowCount; i += 1) {
    tiers[sorted[i]!.i] = "low";
  }
  for (let i = n - highCount; i < n; i += 1) {
    tiers[sorted[i]!.i] = "high";
  }
  return tiers;
}

export function areaShares(areas: number[]): number[] {
  const total = areas.reduce((sum, a) => sum + a, 0);
  if (!(total > 0)) {
    return areas.map(() => 0);
  }
  return areas.map((a) => a / total);
}
