import type { DailyBriefingContextSnapshot } from "@/domain/report/daily-briefing";

export type ReportType =
  | "weather_climate"
  | "water_balance"
  | "agent_briefing"
  | "trace_lot_dossier"
  | "daily_briefing";

export type ReportStatus = "ready" | "failed" | "pending";

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  weather_climate: "Informe climático de parcela",
  water_balance: "Informe hídrico indicativo",
  agent_briefing: "Briefing Agro Agent",
  trace_lot_dossier: "Dossier lote coffee (EUDR)",
  daily_briefing: "Briefing diario",
};

export const POINT_REPORT_TYPES: ReportType[] = [
  "weather_climate",
  "water_balance",
  "agent_briefing",
  "trace_lot_dossier",
];

export interface GeneratedReport {
  id: string;
  orgId: string;
  createdByUserId: string;
  reportType: ReportType;
  status: ReportStatus;
  title: string;
  parcelId: string | null;
  lotId: string | null;
  reportDay: string | null;
  billingMonth: string;
  parentReportId: string | null;
  contextSnapshot: DailyBriefingContextSnapshot | null;
  htmlContent: string;
  pdfBase64: string;
  createdAt: string;
}

export interface SaveGeneratedReportInput {
  orgId: string;
  createdByUserId: string;
  reportType: ReportType;
  status?: ReportStatus;
  title: string;
  parcelId?: string | null;
  lotId?: string | null;
  reportDay?: string | null;
  billingMonth: string;
  parentReportId?: string | null;
  contextSnapshot?: DailyBriefingContextSnapshot | null;
  htmlContent: string;
  pdfBase64: string;
}

export interface ReportRegistry {
  saveReport(input: SaveGeneratedReportInput): Promise<GeneratedReport>;
  getReportById(orgId: string, reportId: string): Promise<GeneratedReport | null>;
  countPointReportsInBillingMonth(orgId: string, billingMonth: string): Promise<number>;
  countDailyBriefingsInBillingMonth(orgId: string, billingMonth: string): Promise<number>;
  findReadyDailyBriefing(
    orgId: string,
    parcelId: string,
    reportDay: string,
  ): Promise<GeneratedReport | null>;
  getLatestReadyDailyBriefing(
    orgId: string,
    parcelId: string,
    beforeReportDay: string,
    withinDays?: number,
  ): Promise<GeneratedReport | null>;
}

export type ReportDenyReason =
  | "unauthenticated"
  | "missing_plus_entitlement"
  | "quota_exceeded"
  | "daily_quota_exceeded"
  | "daily_already_generated"
  | "missing_parcel_access"
  | "report_not_found";

export interface ReportQuotaBucket {
  limit: number;
  used: number;
  remaining: number;
}

export interface ReportQuotaUsage {
  point: ReportQuotaBucket;
  daily: ReportQuotaBucket;
  billingMonth: string;
  planSlug: string;
  plusEnabled: boolean;
  dailyBriefing?: DailyBriefingStatus;
}

export interface DailyBriefingStatus {
  reportDay: string;
  alreadyGenerated: boolean;
  existingReportId: string | null;
  previewUrl: string | null;
}
