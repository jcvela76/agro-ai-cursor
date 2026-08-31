import type { SpectralLegend, SpectralLegendStop, VegetationIndexId } from "@/domain/spectral/types";

const STRESS_TO_HEALTHY: SpectralLegendStop[] = [
  { value: -1, color: "#8B2E1F" },
  { value: -0.5, color: "#B85C38" },
  { value: 0, color: "#C4A035" },
  { value: 0.2, color: "#9BC45A" },
  { value: 0.5, color: "#5A9E4D" },
  { value: 0.8, color: "#2D6B3A" },
  { value: 1, color: "#1F4D2A" },
];

export const SPECTRAL_INDEX_LEGENDS: Record<VegetationIndexId, SpectralLegend> = {
  ndre: {
    min: -1,
    max: 0.8,
    minLabel: "Estrés",
    maxLabel: "Saludable",
    stops: STRESS_TO_HEALTHY.filter((s) => s.value <= 0.8),
  },
  evi: {
    min: -1,
    max: 1,
    minLabel: "Bajo",
    maxLabel: "Denso",
    stops: STRESS_TO_HEALTHY,
  },
  savi: {
    min: -1,
    max: 1,
    minLabel: "Suelo expuesto",
    maxLabel: "Vegetación",
    stops: STRESS_TO_HEALTHY,
  },
  msavi: {
    min: -1,
    max: 1,
    minLabel: "Suelo expuesto",
    maxLabel: "Vegetación",
    stops: STRESS_TO_HEALTHY,
  },
  gndvi: {
    min: -1,
    max: 1,
    minLabel: "Bajo",
    maxLabel: "Alto",
    stops: STRESS_TO_HEALTHY,
  },
  ndwi: {
    min: -1,
    max: 1,
    minLabel: "Menos agua en copa",
    maxLabel: "Más agua en copa",
    stops: STRESS_TO_HEALTHY,
  },
  ndmi: {
    min: -1,
    max: 1,
    minLabel: "Menos agua en copa",
    maxLabel: "Más agua en copa",
    stops: STRESS_TO_HEALTHY,
  },
  nbr: {
    min: -1,
    max: 1,
    minLabel: "Quemado",
    maxLabel: "Denso",
    stops: STRESS_TO_HEALTHY,
  },
};

export function getSpectralLegend(indexId: VegetationIndexId): SpectralLegend {
  return SPECTRAL_INDEX_LEGENDS[indexId];
}

export function clampLegendValue(value: number, legend: SpectralLegend): number {
  return Math.min(legend.max, Math.max(legend.min, value));
}

export function colorForLegendValue(value: number, legend: SpectralLegend): string {
  const clamped = clampLegendValue(value, legend);
  const stops = legend.stops;
  if (stops.length === 0) {
    return "#888888";
  }
  if (clamped <= stops[0].value) {
    return stops[0].color;
  }
  for (let i = 1; i < stops.length; i += 1) {
    const prev = stops[i - 1];
    const next = stops[i];
    if (clamped <= next.value) {
      const t = (clamped - prev.value) / (next.value - prev.value || 1);
      return mixHexColors(prev.color, next.color, t);
    }
  }
  return stops[stops.length - 1].color;
}

function mixHexColors(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const h = hex.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `#${[r, g, bl].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
