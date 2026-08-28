import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import {
  authorizeWeatherAccess,
  authorizeWeatherPlusAccess,
} from "@/domain/auth/authorize-weather-access";
import { currentReportDayKey } from "@/domain/billing/plan-limits";
import type { DailyBriefingContextSnapshot } from "@/domain/report/daily-briefing";
import type { ParcelRegistry } from "@/domain/parcel/types";
import type { ReportRegistry } from "@/domain/report/types";

export interface RecentBriefingSummary {
  id: string;
  reportDay: string;
  title: string;
  createdAt: string;
  contextSnapshot: DailyBriefingContextSnapshot | null;
}

export interface ParcelRecentBriefingsData {
  parcelId: string;
  days: number;
  fromReportDay: string;
  toReportDay: string;
  briefings: RecentBriefingSummary[];
}

export type GetParcelRecentBriefingsResult =
  | { ok: true; data: ParcelRecentBriefingsData }
  | { ok: false; reason: "unavailable"; message: string };

const DEFAULT_DAYS = 3;
const MIN_DAYS = 1;
const MAX_DAYS = 14;

function clampDays(raw: number | undefined): number {
  if (raw == null || !Number.isFinite(raw)) {
    return DEFAULT_DAYS;
  }
  const n = Math.trunc(raw);
  if (n < MIN_DAYS) return MIN_DAYS;
  if (n > MAX_DAYS) return MAX_DAYS;
  return n;
}

/** Inclusive lower bound: today − (days − 1) in calendar days (UTC date math on YYYY-MM-DD). */
export function reportDayWindowStart(toReportDay: string, days: number): string {
  const [y, m, d] = toReportDay.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - (days - 1)));
  return dt.toISOString().slice(0, 10);
}

export class GetParcelRecentBriefings {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly reports: ReportRegistry,
  ) {}

  async execute(input: {
    authority: AccessSnapshot | null | undefined;
    parcelId: string;
    days?: number;
  }): Promise<GetParcelRecentBriefingsResult> {
    if (!authorizeWeatherPlusAccess(input.authority) || !input.authority) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Weather Intelligence Plus is required for recent briefings.",
      };
    }

    const parcel = await this.parcels.getParcel(input.parcelId);
    if (!parcel) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Briefings are not available for this request.",
      };
    }

    const access = authorizeWeatherAccess(
      input.authority,
      input.parcelId,
      parcel.orgId,
    );
    if (!access.ok) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Briefings are not available for this request.",
      };
    }

    const days = clampDays(input.days);
    const toReportDay = currentReportDayKey();
    const fromReportDay = reportDayWindowStart(toReportDay, days);

    const rows = await this.reports.listReadyDailyBriefings(
      input.authority.orgId,
      input.parcelId,
      fromReportDay,
    );

    return {
      ok: true,
      data: {
        parcelId: input.parcelId,
        days,
        fromReportDay,
        toReportDay,
        briefings: rows.map((r) => ({
          id: r.id,
          reportDay: r.reportDay ?? "",
          title: r.title,
          createdAt: r.createdAt,
          contextSnapshot: r.contextSnapshot,
        })),
      },
    };
  }
}
