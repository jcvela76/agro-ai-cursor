import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import { authorizeWeatherPlusAccess } from "@/domain/auth/authorize-weather-access";

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
