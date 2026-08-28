import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type {
  GeneratedReport,
  ReportRegistry,
  SaveGeneratedReportInput,
} from "@/domain/report/types";
import type { Db } from "@/infrastructure/db/client";
import { generatedReports } from "@/infrastructure/db/schema";

export class NeonReportRegistry implements ReportRegistry {
  constructor(private readonly db: Db) {}

  async saveReport(input: SaveGeneratedReportInput): Promise<GeneratedReport> {
    const rows = await this.db
      .insert(generatedReports)
      .values({
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
      })
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error("Failed to insert generated report");
    }
    return this.toReport(row);
  }

  async getReportById(orgId: string, reportId: string): Promise<GeneratedReport | null> {
    const rows = await this.db
      .select()
      .from(generatedReports)
      .where(and(eq(generatedReports.orgId, orgId), eq(generatedReports.id, reportId)))
      .limit(1);
    const row = rows[0];
    return row ? this.toReport(row) : null;
  }

  async countReportsInBillingMonth(orgId: string, billingMonth: string): Promise<number> {
    const rows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(generatedReports)
      .where(
        and(eq(generatedReports.orgId, orgId), eq(generatedReports.billingMonth, billingMonth)),
      );
    return rows[0]?.count ?? 0;
  }

  private toReport(row: typeof generatedReports.$inferSelect): GeneratedReport {
    return {
      id: row.id,
      orgId: row.orgId,
      createdByUserId: row.createdByUserId,
      reportType: row.reportType as GeneratedReport["reportType"],
      title: row.title,
      parcelId: row.parcelId,
      lotId: row.lotId,
      billingMonth: row.billingMonth,
      htmlContent: row.htmlContent,
      pdfBase64: row.pdfBase64,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
