import { tool } from "ai";
import { z } from "zod";
import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import { authorizeWeatherPlusAccess } from "@/domain/auth/authorize-weather-access";
import type { GetParcelWeatherGdd } from "@/application/weather/get-parcel-gdd";
import type { GetParcelWeatherLowRainDays } from "@/application/weather/get-parcel-low-rain-days";
import type { GetParcelWeatherRainfall30d } from "@/application/weather/get-parcel-rainfall-30d";
import type { GetParcelWeatherRainfallCampaignComparison } from "@/application/weather/get-parcel-rainfall-campaign-comparison";
import type { GetParcelWeatherForecast, GetParcelWeatherObservation } from "@/application/weather/get-parcel-weather";

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
} as const;

export const plusToolNames = [
  agroAgentToolNames.rainfall30d,
  agroAgentToolNames.rainfallCampaignComparison,
  agroAgentToolNames.lowRainDays,
  agroAgentToolNames.gdd,
] as const;

export function createAgroAgentTools(input: {
  authority: AccessSnapshot;
  parcelId: string;
  observation: GetParcelWeatherObservation;
  forecast: GetParcelWeatherForecast;
  rainfall30d: GetParcelWeatherRainfall30d;
  rainfallCampaignComparison: GetParcelWeatherRainfallCampaignComparison;
  lowRainDays: GetParcelWeatherLowRainDays;
  gdd: GetParcelWeatherGdd;
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
  };
}
