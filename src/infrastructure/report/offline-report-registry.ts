import { randomUUID } from "node:crypto";
import type {
  GeneratedReport,
  ReportRegistry,
  SaveGeneratedReportInput,
} from "@/domain/report/types";

export class OfflineReportRegistry implements ReportRegistry {
  private readonly reports = new Map<string, GeneratedReport>();

  async saveReport(input: SaveGeneratedReportInput): Promise<GeneratedReport> {
    const report: GeneratedReport = {
      id: `rpt-${randomUUID()}`,
      orgId: input.orgId,
      createdByUserId: input.createdByUserId,
      reportType: input.reportType,
      title: input.title,
      parcelId: input.parcelId ?? null,
      lotId: input.lotId ?? null,
      billingMonth: input.billingMonth,
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

  async countReportsInBillingMonth(orgId: string, billingMonth: string): Promise<number> {
    let count = 0;
    for (const report of this.reports.values()) {
      if (report.orgId === orgId && report.billingMonth === billingMonth) {
        count += 1;
      }
    }
    return count;
  }
}
