import type { DailyBriefingSignal } from "@/domain/report/daily-briefing";
import type { ParcelSpectralZones, SpectralZone, VegetationIndexId } from "@/domain/spectral/types";

export interface SpectralZoneExtremes {
  indexId: VegetationIndexId;
  indexLabel: string;
  low: SpectralZone | null;
  high: SpectralZone | null;
  /** high.value − low.value when both numeric; else null. */
  spread: number | null;
  homogeneous: boolean;
}

export interface SpectralZoneEvidenceRow {
  signal: string;
  value: string;
  source: string;
  validity: string;
}

/** Absolute Δ below this is treated as within-parcel homogeneous (relative tiers). */
export const ZONE_SPREAD_HOMOGENEOUS = 0.05;

export function pickZoneExtremes(zones: ParcelSpectralZones): SpectralZoneExtremes {
  const numeric = zones.zones.filter(
    (z): z is SpectralZone & { value: number } => z.value !== null && Number.isFinite(z.value),
  );
  if (numeric.length === 0) {
    return {
      indexId: zones.indexId,
      indexLabel: zones.label,
      low: null,
      high: null,
      spread: null,
      homogeneous: true,
    };
  }

  let low = numeric[0]!;
  let high = numeric[0]!;
  for (const zone of numeric) {
    if (zone.value < low.value) low = zone;
    if (zone.value > high.value) high = zone;
  }
  const spread = high.value - low.value;
  return {
    indexId: zones.indexId,
    indexLabel: zones.label,
    low,
    high,
    spread,
    homogeneous: spread < ZONE_SPREAD_HOMOGENEOUS || numeric.length === 1,
  };
}

export function formatZoneShare(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** One-line bullet for HTML reports / briefing prose. */
export function zoneExtremesBullet(extremes: SpectralZoneExtremes): string | null {
  if (!extremes.low || extremes.low.value === null) {
    return null;
  }
  if (extremes.homogeneous || !extremes.high || extremes.high.value === null) {
    return `${extremes.indexLabel} relativamente homogéneo en la parcela (zona ${extremes.low.label}: ${extremes.low.value.toFixed(2)}).`;
  }
  return `${extremes.indexLabel} más bajo en ${extremes.low.label} (${extremes.low.value.toFixed(2)}, ${formatZoneShare(extremes.low.areaShare)}) y más alto en ${extremes.high.label} (${extremes.high.value.toFixed(2)}, ${formatZoneShare(extremes.high.areaShare)}); tiers relativos, no umbrales absolutos.`;
}

export function zoneExtremesEvidenceRows(
  extremes: SpectralZoneExtremes,
  source: string,
  validity: string,
): SpectralZoneEvidenceRow[] {
  const rows: SpectralZoneEvidenceRow[] = [];
  if (extremes.low && extremes.low.value !== null) {
    rows.push({
      signal: `${extremes.indexLabel} zona ${extremes.low.label} (baja)`,
      value: `${extremes.low.value.toFixed(3)} · ${formatZoneShare(extremes.low.areaShare)}`,
      source,
      validity,
    });
  }
  if (
    extremes.high &&
    extremes.high.value !== null &&
    (!extremes.homogeneous || extremes.high.id !== extremes.low?.id)
  ) {
    rows.push({
      signal: `${extremes.indexLabel} zona ${extremes.high.label} (alta)`,
      value: `${extremes.high.value.toFixed(3)} · ${formatZoneShare(extremes.high.areaShare)}`,
      source,
      validity,
    });
  }
  if (extremes.spread !== null && !extremes.homogeneous) {
    rows.push({
      signal: `${extremes.indexLabel} Δ zonas`,
      value: extremes.spread.toFixed(3),
      source,
      validity,
    });
  }
  return rows;
}

export function zoneExtremesBriefingSignals(
  extremes: SpectralZoneExtremes,
  source: string,
  validity: string,
): DailyBriefingSignal[] {
  const signals: DailyBriefingSignal[] = [];
  const prefix = extremes.indexId;
  if (extremes.low && extremes.low.value !== null) {
    signals.push({
      id: `${prefix}_zone_low`,
      label: `${extremes.indexLabel} zona baja (${extremes.low.label})`,
      value: Number(extremes.low.value.toFixed(3)),
      source,
      validity,
    });
  }
  if (extremes.high && extremes.high.value !== null && !extremes.homogeneous) {
    signals.push({
      id: `${prefix}_zone_high`,
      label: `${extremes.indexLabel} zona alta (${extremes.high.label})`,
      value: Number(extremes.high.value.toFixed(3)),
      source,
      validity,
    });
  }
  if (extremes.spread !== null) {
    signals.push({
      id: `${prefix}_zone_spread`,
      label: `${extremes.indexLabel} heterogeneidad (Δ)`,
      value: Number(extremes.spread.toFixed(3)),
      source,
      validity,
    });
  }
  return signals;
}
