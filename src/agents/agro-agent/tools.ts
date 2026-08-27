import { tool } from "ai";
import { z } from "zod";
import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import { authorizeWeatherPlusAccess } from "@/domain/auth/authorize-weather-access";
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
} as const;

export const plusToolNames = [] as const;

export function createAgroAgentTools(input: {
  authority: AccessSnapshot;
  parcelId: string;
  observation: GetParcelWeatherObservation;
  forecast: GetParcelWeatherForecast;
}) {
  const { authority, parcelId, observation, forecast } = input;

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
  };
}
