import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { DailyBriefingContextSnapshot } from "@/domain/report/daily-briefing";
import type {
  GeneratedReport,
  ReportRegistry,
  SaveGeneratedReportInput,
} from "@/domain/report/types";
import { POINT_REPORT_TYPES } from "@/domain/report/types";
import type { Db } from "@/infrastructure/db/client";
import { generatedReports } from "@/infrastructure/db/schema";

function reportDayDaysBefore(reportDay: string, days: number): string {
  const [y, m, d] = reportDay.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - days));
  return dt.toISOString().slice(0, 10);
}

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

  async countPointReportsInBillingMonth(orgId: string, billingMonth: string): Promise<number> {
    const rows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(generatedReports)
      .where(
        and(
          eq(generatedReports.orgId, orgId),
          eq(generatedReports.billingMonth, billingMonth),
          eq(generatedReports.status, "ready"),
          inArray(generatedReports.reportType, POINT_REPORT_TYPES),
        ),
      );
    return rows[0]?.count ?? 0;
  }

  async countDailyBriefingsInBillingMonth(orgId: string, billingMonth: string): Promise<number> {
    const rows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(generatedReports)
      .where(
        and(
          eq(generatedReports.orgId, orgId),
          eq(generatedReports.billingMonth, billingMonth),
          eq(generatedReports.status, "ready"),
          eq(generatedReports.reportType, "daily_briefing"),
        ),
      );
    return rows[0]?.count ?? 0;
  }

  async findReadyDailyBriefing(
    orgId: string,
    parcelId: string,
    reportDay: string,
  ): Promise<GeneratedReport | null> {
    const rows = await this.db
      .select()
      .from(generatedReports)
      .where(
        and(
          eq(generatedReports.orgId, orgId),
          eq(generatedReports.parcelId, parcelId),
          eq(generatedReports.reportDay, reportDay),
          eq(generatedReports.reportType, "daily_briefing"),
          eq(generatedReports.status, "ready"),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row ? this.toReport(row) : null;
  }

  async getLatestReadyDailyBriefing(
    orgId: string,
    parcelId: string,
    beforeReportDay: string,
    withinDays = 7,
  ): Promise<GeneratedReport | null> {
    const cutoff = reportDayDaysBefore(beforeReportDay, withinDays);
    const rows = await this.db
      .select()
      .from(generatedReports)
      .where(
        and(
          eq(generatedReports.orgId, orgId),
          eq(generatedReports.parcelId, parcelId),
          eq(generatedReports.reportType, "daily_briefing"),
          eq(generatedReports.status, "ready"),
          lt(generatedReports.reportDay, beforeReportDay),
          gte(generatedReports.reportDay, cutoff),
        ),
      )
      .orderBy(desc(generatedReports.reportDay))
      .limit(1);
    const row = rows[0];
    return row ? this.toReport(row) : null;
  }

  async listReadyDailyBriefings(
    orgId: string,
    parcelId: string,
    fromReportDay: string,
  ): Promise<GeneratedReport[]> {
    const rows = await this.db
      .select()
      .from(generatedReports)
      .where(
        and(
          eq(generatedReports.orgId, orgId),
          eq(generatedReports.parcelId, parcelId),
          eq(generatedReports.reportType, "daily_briefing"),
          eq(generatedReports.status, "ready"),
          gte(generatedReports.reportDay, fromReportDay),
        ),
      )
      .orderBy(desc(generatedReports.reportDay));
    return rows.map((row) => this.toReport(row));
  }

  private toReport(row: typeof generatedReports.$inferSelect): GeneratedReport {
    return {
      id: row.id,
      orgId: row.orgId,
      createdByUserId: row.createdByUserId,
      reportType: row.reportType as GeneratedReport["reportType"],
      status: (row.status ?? "ready") as GeneratedReport["status"],
      title: row.title,
      parcelId: row.parcelId,
      lotId: row.lotId,
      reportDay: row.reportDay,
      billingMonth: row.billingMonth,
      parentReportId: row.parentReportId,
      contextSnapshot: row.contextSnapshot as DailyBriefingContextSnapshot | null,
      htmlContent: row.htmlContent,
      pdfBase64: row.pdfBase64,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
