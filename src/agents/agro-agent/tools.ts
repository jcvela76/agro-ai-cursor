import { tool } from "ai";
import { z } from "zod";
import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import { authorizeWeatherPlusAccess } from "@/domain/auth/authorize-weather-access";
import type { GetParcelRecentBriefings } from "@/application/report/get-parcel-recent-briefings";
import type {
  GetParcelAgronomicProfile,
  UpdateParcelAgronomicProfile,
} from "@/application/parcel/parcel-agronomic-profile";
import type { GetParcelVegetationIndices } from "@/application/spectral/get-parcel-vegetation-indices";
import type { GetParcelSpectralZones } from "@/application/spectral/get-parcel-spectral-zones";
import type { GetParcelSpectralHistory } from "@/application/spectral/get-parcel-spectral-history";
import type { GetParcelWeatherEt0 } from "@/application/weather/get-parcel-et0";
import { isVegetationIndexId } from "@/application/spectral/get-parcel-spectral-overlay";
import type { GetParcelWeatherGdd } from "@/application/weather/get-parcel-gdd";
import type { GetParcelWeatherLowRainDays } from "@/application/weather/get-parcel-low-rain-days";
import type { GetParcelWeatherRainfall30d } from "@/application/weather/get-parcel-rainfall-30d";
import type { GetParcelWeatherRainfallCampaignComparison } from "@/application/weather/get-parcel-rainfall-campaign-comparison";
import type { GetParcelWeatherForecast, GetParcelWeatherObservation } from "@/application/weather/get-parcel-weather";
import { parseProfileFields } from "@/domain/parcel/agronomic-profile";

export interface AgroAgentToolContext {
  authority: AccessSnapshot | null;
}

export function isPlusToolAllowed(context: AgroAgentToolContext): boolean {
  return authorizeWeatherPlusAccess(context.authority);
}

export const agroAgentToolNames = {
  observation: "getParcelWeatherObservation",
  forecast: "getParcelWeatherForecast",
  rainfall30d: "getParcelRainfall30d",
  rainfallCampaignComparison: "getParcelRainfallCampaignComparison",
  lowRainDays: "getParcelLowRainDays",
  gdd: "getParcelGdd",
  et0: "getParcelEt0",
  vegetationIndices: "getParcelVegetationIndices",
  spectralZones: "getParcelSpectralZones",
  spectralHistory: "getParcelSpectralHistory",
  recentBriefings: "getParcelRecentBriefings",
  getProfile: "getParcelProfile",
  updateProfile: "updateParcelProfile",
} as const;

export const plusToolNames = [
  agroAgentToolNames.rainfall30d,
  agroAgentToolNames.rainfallCampaignComparison,
  agroAgentToolNames.lowRainDays,
  agroAgentToolNames.gdd,
  agroAgentToolNames.et0,
  agroAgentToolNames.vegetationIndices,
  agroAgentToolNames.spectralZones,
  agroAgentToolNames.spectralHistory,
  agroAgentToolNames.recentBriefings,
  agroAgentToolNames.getProfile,
  agroAgentToolNames.updateProfile,
] as const;

const optionalProfileText = z.string().max(500).nullable().optional();

export function createAgroAgentTools(input: {
  authority: AccessSnapshot;
  parcelId: string;
  observation: GetParcelWeatherObservation;
  forecast: GetParcelWeatherForecast;
  rainfall30d: GetParcelWeatherRainfall30d;
  rainfallCampaignComparison: GetParcelWeatherRainfallCampaignComparison;
  lowRainDays: GetParcelWeatherLowRainDays;
  gdd: GetParcelWeatherGdd;
  et0: GetParcelWeatherEt0;
  vegetationIndices: GetParcelVegetationIndices;
  spectralZones: GetParcelSpectralZones;
  spectralHistory: GetParcelSpectralHistory;
  recentBriefings: GetParcelRecentBriefings;
  getProfile: GetParcelAgronomicProfile;
  updateProfile: UpdateParcelAgronomicProfile;
}) {
  const {
    authority,
    parcelId,
    observation,
    forecast,
    rainfall30d,
    rainfallCampaignComparison,
    lowRainDays,
    gdd,
    et0,
    vegetationIndices,
    spectralZones,
    spectralHistory,
    recentBriefings,
    getProfile,
    updateProfile,
  } = input;

  return {
    getParcelWeatherObservation: tool({
      description:
        "Obtiene la última observación climática autorizada para la parcela activa (temperatura, precipitación y evidencia).",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await observation.execute({ authority, parcelId });
        if (!result.ok) {
          return { ok: false as const, reason: result.reason, message: result.message };
        }
        return { ok: true as const, data: result.data };
      },
    }),
    getParcelWeatherForecast: tool({
      description:
        "Obtiene el pronóstico climático autorizado para la parcela activa (días, temperaturas, precipitación y evidencia).",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await forecast.execute({ authority, parcelId });
        if (!result.ok) {
          return { ok: false as const, reason: result.reason, message: result.message };
        }
        return { ok: true as const, data: result.data };
      },
    }),
    getParcelRainfall30d: tool({
      description:
        "Obtiene la lluvia acumulada en los últimos 30 días para la parcela activa (suma determinística diaria con evidencia). Requiere Plus.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await rainfall30d.execute({ authority, parcelId });
        if (!result.ok) {
          return { ok: false as const, reason: result.reason, message: result.message };
        }
        return { ok: true as const, data: result.data };
      },
    }),
    getParcelRainfallCampaignComparison: tool({
      description:
        "Compara la lluvia acumulada de la campaña (año calendario YTD) con el mismo rango del año anterior. Método versionado con evidencia. Requiere Plus.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await rainfallCampaignComparison.execute({ authority, parcelId });
        if (!result.ok) {
          return { ok: false as const, reason: result.reason, message: result.message };
        }
        return { ok: true as const, data: result.data };
      },
    }),
    getParcelLowRainDays: tool({
      description:
        "Ranking de días del horizonte de pronóstico con menor probabilidad de precipitación (método versionado + evidencia). Requiere Plus.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await lowRainDays.execute({ authority, parcelId });
        if (!result.ok) {
          return { ok: false as const, reason: result.reason, message: result.message };
        }
        return { ok: true as const, data: result.data };
      },
    }),
    getParcelGdd: tool({
      description:
        "Estima grados-día de crecimiento (GDD) acumulados en la campaña año calendario YTD con base 10 °C y Tmax/Tmin diarios (método versionado + evidencia). Requiere Plus.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await gdd.execute({ authority, parcelId });
        if (!result.ok) {
          return { ok: false as const, reason: result.reason, message: result.message };
        }
        return { ok: true as const, data: result.data };
      },
    }),
    getParcelEt0: tool({
      description:
        "Estima evapotranspiración de referencia ET0 (mm) acumulada en la campaña año calendario YTD con Hargreaves–Samani sobre Tmax/Tmin (método versionado + evidencia). Requiere Plus. No es ETc de cultivo.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await et0.execute({ authority, parcelId });
        if (!result.ok) {
          return { ok: false as const, reason: result.reason, message: result.message };
        }
        return { ok: true as const, data: result.data };
      },
    }),
    getParcelVegetationIndices: tool({
      description:
        "Obtiene índices de vegetación (NDRE, EVI, SAVI, MSAVI, GNDVI, NDWI, NDMI, NBR) derivados de reflectancia multiespectral con evidencia de escena. Usar NDWI/NDMI para preguntas de humedad/riego (orientación basada en evidencia). Requiere Plus.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await vegetationIndices.execute({ authority, parcelId });
        if (!result.ok) {
          return { ok: false as const, reason: result.reason, message: result.message };
        }
        return { ok: true as const, data: result.data };
      },
    }),
    getParcelSpectralZones: tool({
      description:
        "Analiza heterogeneidad dentro de la parcela: media del índice por zonas (fishnet) con tier relativo bajo/medio/alto y brújula (N/S/E/O). Usar cuando pregunten por zonas, manchas, dónde está peor/mejor el cultivo, o variabilidad espacial. Requiere Plus. Parámetro index (ndre|evi|savi|msavi|gndvi|ndwi|ndmi|nbr), default ndre.",
      inputSchema: z.object({
        index: z.string().optional(),
      }),
      execute: async ({ index }) => {
        const indexId = index && isVegetationIndexId(index) ? index : "ndre";
        const result = await spectralZones.execute({ authority, parcelId, indexId });
        if (!result.ok) {
          return { ok: false as const, reason: result.reason, message: result.message };
        }
        return { ok: true as const, data: result.data };
      },
    }),
    getParcelSpectralHistory: tool({
      description:
        "Historial de escenas espectrales persistidas de la parcela (medias por fecha, últimos N días). Usar para tendencias, evolución, comparar fechas. Requiere Plus. Parámetro opcional days (1–365, default 90).",
      inputSchema: z.object({
        days: z.number().int().min(1).max(365).optional(),
      }),
      execute: async ({ days }) => {
        const result = await spectralHistory.execute({ authority, parcelId, days });
        if (!result.ok) {
          return { ok: false as const, reason: result.reason, message: result.message };
        }
        return { ok: true as const, data: result.data };
      },
    }),
    getParcelRecentBriefings: tool({
      description:
        "Lee briefings diarios recientes de la parcela activa (snapshots de señales/sugerencias por reportDay). Memoria día-a-día para riego/labores/clima. Citar reportDay; si la lista está vacía, no inventar memoria. Requiere Plus. Parámetro opcional days (1–14, default 3).",
      inputSchema: z.object({
        days: z.number().int().min(1).max(14).optional(),
      }),
      execute: async ({ days }) => {
        const result = await recentBriefings.execute({ authority, parcelId, days });
        if (!result.ok) {
          return { ok: false as const, reason: result.reason, message: result.message };
        }
        return { ok: true as const, data: result.data };
      },
    }),
    getParcelProfile: tool({
      description:
        "Lee el perfil agronómico persistido de la parcela activa (cultivo, siembra, riego, fenología, etc.). Usar antes de orientar riego/labores. Campos null = desconocidos. Requiere Plus.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await getProfile.execute({ authority, parcelId });
        if (!result.ok) {
          return { ok: false as const, reason: result.reason, message: result.message };
        }
        return { ok: true as const, data: result.data };
      },
    }),
    updateParcelProfile: tool({
      description:
        "Guarda de inmediato campos del perfil agronómico de la parcela activa (sin pedir confirmación extra). Solo envía campos que el usuario acaba de indicar; null borra un campo. Resume lo guardado. Requiere Plus.",
      inputSchema: z.object({
        crop: optionalProfileText,
        sowingDate: optionalProfileText,
        phenologyStage: optionalProfileText,
        irrigationSystem: optionalProfileText,
        irrigationFrequency: optionalProfileText,
        lastApplication: optionalProfileText,
        expectedHarvest: optionalProfileText,
        notes: optionalProfileText,
      }),
      execute: async (raw) => {
        const fields = parseProfileFields(raw);
        const result = await updateProfile.execute({ authority, parcelId, fields });
        if (!result.ok) {
          return { ok: false as const, reason: result.reason, message: result.message };
        }
        return { ok: true as const, data: result.data };
      },
    }),
  };
}
