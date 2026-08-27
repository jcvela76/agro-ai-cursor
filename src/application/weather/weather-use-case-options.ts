import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import { authorizeWeatherPlusAccess } from "@/domain/auth/authorize-weather-access";
import type { WeatherResult } from "@/domain/weather/types";

/** Options shared by parcel weather use cases (ADR-031). */
export interface WeatherUseCaseOptions {
  /**
   * Paid provider mode (e.g. SENAMHI stub). Requires weather_plus in addition to
   * base weather parcel authorization (ADR-006).
   */
  requirePaidWeatherProvider?: boolean;
}

const PAID_PROVIDER_UNAVAILABLE: WeatherResult<never> = {
  ok: false,
  reason: "unavailable",
  message: "Weather data is not available for this request.",
};

export function denyUnlessPaidWeatherProvider(
  authority: AccessSnapshot | null | undefined,
  requirePaidWeatherProvider: boolean | undefined,
): WeatherResult<never> | null {
  if (!requirePaidWeatherProvider) {
    return null;
  }
  if (!authorizeWeatherPlusAccess(authority)) {
    return PAID_PROVIDER_UNAVAILABLE;
  }
  return null;
}

/** True when WEATHER_SOURCE selects a paid SENAMHI provider path. */
export function isPaidWeatherSourceMode(mode: string): boolean {
  return mode === "senamhi_stub" || mode === "senamhi";
}
