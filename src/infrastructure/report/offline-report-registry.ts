import { randomUUID } from "node:crypto";
import type {
  GeneratedReport,
  ReportRegistry,
  SaveGeneratedReportInput,
} from "@/domain/report/types";
import { POINT_REPORT_TYPES } from "@/domain/report/types";

function reportDayDaysBefore(reportDay: string, days: number): string {
  const [y, m, d] = reportDay.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - days));
  return dt.toISOString().slice(0, 10);
}

export class OfflineReportRegistry implements ReportRegistry {
  private readonly reports = new Map<string, GeneratedReport>();

  async saveReport(input: SaveGeneratedReportInput): Promise<GeneratedReport> {
    const report: GeneratedReport = {
      id: `rpt-${randomUUID()}`,
      orgId: input.orgId,
      createdByUserId: input.createdByUserId,
      reportType: input.reportType,
      status: input.status ?? "ready",
      title: input.title,
      parcelId: input.parcelId ?? null,
      lotId: input.lotId ?? null,
      reportDay: input.reportDay ?? null,
      billingMonth: input.billingMonth,
      parentReportId: input.parentReportId ?? null,
      contextSnapshot: input.contextSnapshot ?? null,
      htmlContent: input.htmlContent,
      pdfBase64: input.pdfBase64,
      createdAt: new Date().toISOString(),
    };
    this.reports.set(report.id, report);
    return report;
  }

  async getReportById(orgId: string, reportId: string): Promise<GeneratedReport | null> {
    const report = this.reports.get(reportId);
    if (!report || report.orgId !== orgId) {
      return null;
    }
    return report;
  }

  async countPointReportsInBillingMonth(orgId: string, billingMonth: string): Promise<number> {
    let count = 0;
    for (const report of this.reports.values()) {
      if (
        report.orgId === orgId &&
        report.billingMonth === billingMonth &&
        report.status === "ready" &&
        POINT_REPORT_TYPES.includes(report.reportType)
      ) {
        count += 1;
      }
    }
    return count;
  }

  async countDailyBriefingsInBillingMonth(orgId: string, billingMonth: string): Promise<number> {
    let count = 0;
    for (const report of this.reports.values()) {
      if (
        report.orgId === orgId &&
        report.billingMonth === billingMonth &&
        report.status === "ready" &&
        report.reportType === "daily_briefing"
      ) {
        count += 1;
      }
    }
    return count;
  }

  async findReadyDailyBriefing(
    orgId: string,
    parcelId: string,
    reportDay: string,
  ): Promise<GeneratedReport | null> {
    for (const report of this.reports.values()) {
      if (
        report.orgId === orgId &&
        report.parcelId === parcelId &&
        report.reportDay === reportDay &&
        report.reportType === "daily_briefing" &&
        report.status === "ready"
      ) {
        return report;
      }
    }
    return null;
  }

  async getLatestReadyDailyBriefing(
    orgId: string,
    parcelId: string,
    beforeReportDay: string,
    withinDays = 7,
  ): Promise<GeneratedReport | null> {
    const cutoff = reportDayDaysBefore(beforeReportDay, withinDays);
    let latest: GeneratedReport | null = null;

    for (const report of this.reports.values()) {
      if (
        report.orgId !== orgId ||
        report.parcelId !== parcelId ||
        report.reportType !== "daily_briefing" ||
        report.status !== "ready" ||
        !report.reportDay ||
        report.reportDay >= beforeReportDay ||
        report.reportDay < cutoff
      ) {
        continue;
      }
      if (!latest || (report.reportDay ?? "") > (latest.reportDay ?? "")) {
        latest = report;
      }
    }

    return latest;
  }

  async listReadyDailyBriefings(
    orgId: string,
    parcelId: string,
    fromReportDay: string,
  ): Promise<GeneratedReport[]> {
    const matched: GeneratedReport[] = [];
    for (const report of this.reports.values()) {
      if (
        report.orgId !== orgId ||
        report.parcelId !== parcelId ||
        report.reportType !== "daily_briefing" ||
        report.status !== "ready" ||
        !report.reportDay ||
        report.reportDay < fromReportDay
      ) {
        continue;
      }
      matched.push(report);
    }
    matched.sort((a, b) => (b.reportDay ?? "").localeCompare(a.reportDay ?? ""));
    return matched;
  }
}
