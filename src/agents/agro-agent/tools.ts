import { tool } from "ai";
import { z } from "zod";
import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import { authorizeWeatherPlusAccess } from "@/domain/auth/authorize-weather-access";
import type { GetParcelRecentBriefings } from "@/application/report/get-parcel-recent-briefings";
import type {
  GetParcelAgronomicProfile,
  UpdateParcelAgronomicProfile,
} from "@/application/parcel/parcel-agronomic-profile";
import type {
  AppendParcelFieldNote,
  ListParcelFieldNotes,
} from "@/application/field-note/parcel-field-notes";
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
  getFieldNotes: "getParcelFieldNotes",
  appendFieldNote: "appendParcelFieldNote",
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
  agroAgentToolNames.getFieldNotes,
  agroAgentToolNames.appendFieldNote,
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
  listFieldNotes: ListParcelFieldNotes;
  appendFieldNote: AppendParcelFieldNote;
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
    listFieldNotes,
    appendFieldNote,
  } = input;

  return {
    getParcelWeatherObservation: tool({
      description:
        "Obtiene la última observación climática autorizada para la parcela activa (temperatura, precipitación, humedad relativa del aire a 2 m, velocidad de viento a 2 m, y evidencia). HR ≠ humedad de suelo.",
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
        "Compara la lluvia acumulada de la campaña (desde siembra si está en perfil; si no, YTD calendario) con el mismo rango del año anterior. Método versionado con evidencia. Requiere Plus.",
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
        "Estima grados-día de crecimiento (GDD) acumulados en la campaña (desde siembra o YTD) con base °C del cultivo/perfil y Tmax/Tmin diarios (método versionado + evidencia). Requiere Plus.",
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
        "Estima evapotranspiración de referencia ET0 (mm) acumulada en la campaña (desde siembra o YTD) con Hargreaves–Samani. Si hay cultivo en perfil, incluye etcEstimateMm = Kc×ET0 (orientativo, no dosis de riego). Requiere Plus.",
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
        "Historial de escenas espectrales persistidas de la parcela (medias por fecha, últimos N días). Usar para tendencias y para comparar dos acquisitionDate (citar fechas e índice). Requiere Plus. Parámetro opcional days (1–365, default 90).",
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
        "Lee el perfil agronómico persistido de la parcela activa (cropKey, cultivo, siembra YYYY-MM-DD, riego, fenología, gddBase). Usar antes de orientar riego/labores. Campos null = desconocidos. Requiere Plus.",
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
        "Guarda de inmediato campos del perfil agronómico de la parcela activa (sin pedir confirmación extra). Usa cropKey del catálogo PE (cafe|uva|esparrago|palto|maiz|papa|citricos|otro). sowingDate debe ser YYYY-MM-DD. Solo envía campos que el usuario acaba de indicar; null borra un campo. Resume lo guardado. Requiere Plus.",
      inputSchema: z.object({
        cropKey: z
          .enum(["cafe", "uva", "esparrago", "palto", "maiz", "papa", "citricos", "otro"])
          .nullable()
          .optional(),
        crop: optionalProfileText,
        sowingDate: optionalProfileText,
        phenologyStage: optionalProfileText,
        irrigationSystem: optionalProfileText,
        irrigationFrequency: optionalProfileText,
        lastApplication: optionalProfileText,
        expectedHarvest: optionalProfileText,
        notes: optionalProfileText,
        gddBaseCelsius: z.number().min(0).max(20).nullable().optional(),
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
    getParcelFieldNotes: tool({
      description:
        "Lista notas recientes de la bitácora de campo de la parcela activa (inspección, estrés visto, riego aplicado). No es Agronomic Review. Citar fecha y zona si hay. Requiere Plus. Parámetro opcional limit (1–50, default 10).",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).optional(),
      }),
      execute: async ({ limit }) => {
        const result = await listFieldNotes.execute({
          authority,
          parcelId,
          limit: limit ?? 10,
        });
        if (!result.ok) {
          return { ok: false as const, reason: result.reason, message: result.message };
        }
        return { ok: true as const, data: result.data };
      },
    }),
    appendParcelFieldNote: tool({
      description:
        "Guarda una nota de bitácora de campo cuando el usuario dicta una observación (inspección, estrés, riego aplicado, etc.). No uses esto para decisiones formales de Review. body obligatorio (≤2000). zoneLabel opcional (≤80, ej. SO). observedAt ISO opcional. Resume lo guardado. Requiere Plus.",
      inputSchema: z.object({
        body: z.string().min(1).max(2000),
        zoneLabel: z.string().max(80).nullable().optional(),
        observedAt: z.string().nullable().optional(),
      }),
      execute: async ({ body, zoneLabel, observedAt }) => {
        const result = await appendFieldNote.execute({
          authority,
          parcelId,
          body,
          zoneLabel: zoneLabel ?? undefined,
          observedAt: observedAt ?? undefined,
        });
        if (!result.ok) {
          return { ok: false as const, reason: result.reason, message: result.message };
        }
        return { ok: true as const, data: result.data };
      },
    }),
  };
}
