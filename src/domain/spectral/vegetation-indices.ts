import type { SpectralReflectanceBands, VegetationIndexId, VegetationIndexReading } from "@/domain/spectral/types";

const SAVI_SOIL_BRIGHTNESS = 0.5;

export const VEGETATION_INDEX_CATALOG: Record<
  VegetationIndexId,
  { label: string; description: string; methodId: string }
> = {
  ndre: {
    label: "NDRE",
    description:
      "Normalized Difference Red Edge — útil para detectar estrés y cambios de clorofila en cultivos desarrollados.",
    methodId: "ndre-rededge-nir/v1",
  },
  evi: {
    label: "EVI",
    description:
      "Enhanced Vegetation Index — similar a NDVI, con mejor desempeño en vegetación densa y menor efecto atmosférico.",
    methodId: "evi-huan-et-al/v1",
  },
  savi: {
    label: "SAVI",
    description:
      "Soil Adjusted Vegetation Index — corrige la influencia del suelo cuando la cobertura vegetal es baja.",
    methodId: "savi-l05/v1",
  },
  msavi: {
    label: "MSAVI",
    description:
      "Modified SAVI — variante mejorada de SAVI para terrenos con mucha exposición de suelo.",
    methodId: "msavi2/v1",
  },
  gndvi: {
    label: "GNDVI",
    description:
      "Green NDVI — usa la banda verde; sensible a clorofila y contenido de nitrógeno.",
    methodId: "gndvi-green-nir/v1",
  },
  ndwi: {
    label: "NDWI",
    description:
      "Normalized Difference Water Index — relacionado con contenido de agua/humedad en la vegetación.",
    methodId: "ndwi-mcfeeters-green-nir/v1",
  },
  ndmi: {
    label: "NDMI",
    description:
      "Normalized Difference Moisture Index — humedad de la vegetación; ayuda a identificar estrés hídrico.",
    methodId: "ndmi-nir-swir/v1",
  },
  nbr: {
    label: "NBR",
    description:
      "Normalized Burn Ratio — incendios y daño por fuego; también daño severo en vegetación.",
    methodId: "nbr-nir-swir2/v1",
  },
};

function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) {
    return null;
  }
  return numerator / denominator;
}

export function computeNdre(bands: SpectralReflectanceBands): number | null {
  return ratio(bands.nir - bands.redEdge, bands.nir + bands.redEdge);
}

export function computeEvi(bands: SpectralReflectanceBands): number | null {
  const denominator = bands.nir + 6 * bands.red - 7.5 * bands.blue + 1;
  const value = ratio(2.5 * (bands.nir - bands.red), denominator);
  return value === null ? null : value;
}

export function computeSavi(bands: SpectralReflectanceBands): number | null {
  const l = SAVI_SOIL_BRIGHTNESS;
  const inner = ratio(bands.nir - bands.red, bands.nir + bands.red + l);
  return inner === null ? null : inner * (1 + l);
}

export function computeMsavi(bands: SpectralReflectanceBands): number | null {
  const term = 2 * bands.nir + 1;
  const discriminant = term * term - 8 * (bands.nir - bands.red);
  if (discriminant < 0) {
    return null;
  }
  return (term - Math.sqrt(discriminant)) / 2;
}

export function computeGndvi(bands: SpectralReflectanceBands): number | null {
  return ratio(bands.nir - bands.green, bands.nir + bands.green);
}

export function computeNdwi(bands: SpectralReflectanceBands): number | null {
  return ratio(bands.green - bands.nir, bands.green + bands.nir);
}

export function computeNdmi(bands: SpectralReflectanceBands): number | null {
  return ratio(bands.nir - bands.swir, bands.nir + bands.swir);
}

export function computeNbr(bands: SpectralReflectanceBands): number | null {
  return ratio(bands.nir - bands.swir2, bands.nir + bands.swir2);
}

const COMPUTERS: Record<VegetationIndexId, (bands: SpectralReflectanceBands) => number | null> = {
  ndre: computeNdre,
  evi: computeEvi,
  savi: computeSavi,
  msavi: computeMsavi,
  gndvi: computeGndvi,
  ndwi: computeNdwi,
  ndmi: computeNdmi,
  nbr: computeNbr,
};

export const VEGETATION_INDEX_ORDER: VegetationIndexId[] = [
  "ndre",
  "evi",
  "savi",
  "msavi",
  "gndvi",
  "ndwi",
  "ndmi",
  "nbr",
];

export function computeVegetationIndex(
  id: VegetationIndexId,
  bands: SpectralReflectanceBands,
): number | null {
  return COMPUTERS[id](bands);
}

export function computeVegetationIndices(
  bands: SpectralReflectanceBands,
): VegetationIndexReading[] {
  return VEGETATION_INDEX_ORDER.map((id) => {
    const meta = VEGETATION_INDEX_CATALOG[id];
    return {
      id,
      label: meta.label,
      description: meta.description,
      methodId: meta.methodId,
      value: COMPUTERS[id](bands),
    };
  });
}
