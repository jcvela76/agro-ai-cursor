export type ReportType =
  | "weather_climate"
  | "water_balance"
  | "agent_briefing"
  | "trace_lot_dossier";

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  weather_climate: "Informe climático de parcela",
  water_balance: "Informe hídrico indicativo",
  agent_briefing: "Briefing Agro Agent",
  trace_lot_dossier: "Dossier lote coffee (EUDR)",
};

export interface GeneratedReport {
  id: string;
  orgId: string;
  createdByUserId: string;
  reportType: ReportType;
  title: string;
  parcelId: string | null;
  lotId: string | null;
  billingMonth: string;
  htmlContent: string;
  pdfBase64: string;
  createdAt: string;
}

export interface SaveGeneratedReportInput {
  orgId: string;
  createdByUserId: string;
  reportType: ReportType;
  title: string;
  parcelId?: string | null;
  lotId?: string | null;
  billingMonth: string;
  htmlContent: string;
  pdfBase64: string;
}

export interface ReportRegistry {
  saveReport(input: SaveGeneratedReportInput): Promise<GeneratedReport>;
  getReportById(orgId: string, reportId: string): Promise<GeneratedReport | null>;
  countReportsInBillingMonth(orgId: string, billingMonth: string): Promise<number>;
}

export type ReportDenyReason =
  | "unauthenticated"
  | "missing_plus_entitlement"
  | "quota_exceeded"
  | "missing_parcel_access"
  | "report_not_found";

export interface ReportQuotaUsage {
  limit: number;
  used: number;
  remaining: number;
  billingMonth: string;
  planSlug: string;
  plusEnabled: boolean;
}
