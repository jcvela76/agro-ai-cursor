import type {
  WeatherCampaignQuery,
  WeatherCampaignSource,
} from "@/domain/weather/types";
import { GDD_BASE_TEMP_CELSIUS } from "@/domain/weather/compute-gdd";
import { currentReportDayKey } from "@/domain/billing/plan-limits";

export function defaultCalendarYtdQuery(now = new Date()): WeatherCampaignQuery {
  const endDate = currentReportDayKey(now);
  const year = endDate.slice(0, 4);
  return {
    startDate: `${year}-01-01`,
    endDate,
    source: "calendar_ytd",
    baseTempCelsius: GDD_BASE_TEMP_CELSIUS,
  };
}

export function resolveWeatherCampaignQuery(
  query: WeatherCampaignQuery | undefined,
  now = new Date(),
): Required<WeatherCampaignQuery> {
  const fallback = defaultCalendarYtdQuery(now);
  return {
    startDate: query?.startDate ?? fallback.startDate,
    endDate: query?.endDate ?? fallback.endDate,
    source: query?.source ?? fallback.source,
    baseTempCelsius: query?.baseTempCelsius ?? GDD_BASE_TEMP_CELSIUS,
  };
}

/** Shift YYYY-MM-DD back one calendar year (same month-day). */
export function shiftIsoDateYears(isoDate: string, years: number): string {
  const y = Number(isoDate.slice(0, 4)) + years;
  return `${String(y).padStart(4, "0")}${isoDate.slice(4)}`;
}

export function campaignMethodSuffix(source: WeatherCampaignSource): string {
  return source === "sowing" ? "desde_siembra" : "calendario_ytd";
}
