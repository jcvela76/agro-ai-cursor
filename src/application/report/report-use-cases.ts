import { authorizeWeatherPlusAccess } from "@/domain/auth/authorize-weather-access";
import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import {
  currentBillingMonthKey,
  currentReportDayKey,
  dailyBriefingQuotaUsage,
  inferPlanSlugForQuota,
  reportQuotaUsage,
} from "@/domain/billing/plan-limits";
import type {
  DailyBriefingStatus,
  ReportQuotaUsage,
  ReportRegistry,
  ReportType,
} from "@/domain/report/types";
import type { OrgMetadataStore } from "@/domain/workspace/types";
import type { BuildDailyBriefing } from "@/application/report/build-daily-briefing";
import type { BuildReportContent } from "@/application/report/build-report-content";
import type { PdfRenderer } from "@/infrastructure/report/stub-pdf-renderer";

async function resolveReportQuota(
  reports: ReportRegistry,
  orgId: string,
  planSlug: string,
): Promise<Pick<ReportQuotaUsage, "point" | "daily" | "billingMonth">> {
  const billingMonth = currentBillingMonthKey();
  const [pointUsed, dailyUsed] = await Promise.all([
    reports.countPointReportsInBillingMonth(orgId, billingMonth),
    reports.countDailyBriefingsInBillingMonth(orgId, billingMonth),
  ]);
  const point = reportQuotaUsage({ used: pointUsed, planSlug });
  const daily = dailyBriefingQuotaUsage({ used: dailyUsed, planSlug });
  return {
    billingMonth,
    point: { limit: point.limit, used: point.used, remaining: point.remaining },
    daily: { limit: daily.limit, used: daily.used, remaining: daily.remaining },
  };
}

export class GetReportQuota {
  constructor(
    private readonly reports: ReportRegistry,
    private readonly metadataStore: OrgMetadataStore,
  ) {}

  async execute(
    authority: AccessSnapshot | null,
    options?: { parcelId?: string },
  ): Promise<ReportQuotaUsage & { dailyBriefing?: DailyBriefingStatus }> {
    const billingMonth = currentBillingMonthKey();
    const plusEnabled = authorizeWeatherPlusAccess(authority);

    if (!authority || !plusEnabled) {
      return {
        point: { limit: 0, used: 0, remaining: 0 },
        daily: { limit: 0, used: 0, remaining: 0 },
        billingMonth,
        planSlug: "free",
        plusEnabled: false,
      };
    }

    const settings = await this.metadataStore.getPublicMetadata(authority.orgId);
    const planSlug = inferPlanSlugForQuota({
      billingPlanSlug: settings.billingPlanSlug,
      entitlements: settings.entitlements,
    });
    const buckets = await resolveReportQuota(this.reports, authority.orgId, planSlug);

    let dailyBriefing: DailyBriefingStatus | undefined;
    if (options?.parcelId) {
      const reportDay = currentReportDayKey();
      const existing = await this.reports.findReadyDailyBriefing(
        authority.orgId,
        options.parcelId,
        reportDay,
      );
      dailyBriefing = {
        reportDay,
        alreadyGenerated: Boolean(existing),
        existingReportId: existing?.id ?? null,
        previewUrl: existing ? `/reports/${existing.id}` : null,
      };
    }

    return {
      ...buckets,
      planSlug,
      plusEnabled: true,
      ...(dailyBriefing ? { dailyBriefing } : {}),
    };
  }
}

export class GenerateOrgReport {
  constructor(
    private readonly reports: ReportRegistry,
    private readonly builder: BuildReportContent,
    private readonly dailyBuilder: BuildDailyBriefing,
    private readonly pdf: PdfRenderer,
    private readonly metadataStore: OrgMetadataStore,
  ) {}

  async execute(input: {
    authority: AccessSnapshot;
    reportType: ReportType;
    parcelId?: string;
    lotId?: string;
    agentQuestion?: string;
    agentAnswerMarkdown?: string;
  }) {
    if (!authorizeWeatherPlusAccess(input.authority)) {
      return {
        ok: false as const,
        reason: "missing_plus_entitlement" as const,
        message: "Weather Intelligence Plus es requerido para generar informes.",
      };
    }

    const billingMonth = currentBillingMonthKey();
    const settings = await this.metadataStore.getPublicMetadata(input.authority.orgId);
    const planSlug = inferPlanSlugForQuota({
      billingPlanSlug: settings.billingPlanSlug,
      entitlements: settings.entitlements,
    });

    if (input.reportType === "daily_briefing") {
      return this.generateDailyBriefing(input, billingMonth, planSlug);
    }

    const buckets = await resolveReportQuota(this.reports, input.authority.orgId, planSlug);
    if (buckets.point.remaining <= 0 || buckets.point.limit === 0) {
      return {
        ok: false as const,
        reason: "quota_exceeded" as const,
        message: `Cuota mensual de informes alcanzada (${buckets.point.used}/${buckets.point.limit}).`,
        quota: await this.fullQuota(input.authority.orgId, planSlug),
      };
    }

    const built = await this.builder.execute({
      reportType: input.reportType,
      authority: input.authority,
      parcelId: input.parcelId,
      lotId: input.lotId,
      agentQuestion: input.agentQuestion,
      agentAnswerMarkdown: input.agentAnswerMarkdown,
    });

    if ("ok" in built) {
      return { ok: false as const, reason: "missing_parcel_access" as const, message: built.message };
    }

    const pdfBuffer = await this.pdf.render(built.htmlContent);

    const saved = await this.reports.saveReport({
      orgId: input.authority.orgId,
      createdByUserId: input.authority.userId,
      reportType: input.reportType,
      title: built.title,
      parcelId: built.parcelId,
      lotId: built.lotId,
      billingMonth,
      htmlContent: built.htmlContent,
      pdfBase64: pdfBuffer.toString("base64"),
    });

    return {
      ok: true as const,
      report: saved,
      quota: await this.fullQuota(input.authority.orgId, planSlug),
    };
  }

  private async generateDailyBriefing(
    input: {
      authority: AccessSnapshot;
      parcelId?: string;
    },
    billingMonth: string,
    planSlug: string,
  ) {
    if (!input.parcelId) {
      return {
        ok: false as const,
        reason: "missing_parcel_access" as const,
        message: "parcelId es requerido para el briefing diario.",
      };
    }

    const reportDay = currentReportDayKey();
    const existing = await this.reports.findReadyDailyBriefing(
      input.authority.orgId,
      input.parcelId,
      reportDay,
    );
    if (existing) {
      return {
        ok: false as const,
        reason: "daily_already_generated" as const,
        message: "Ya existe un briefing diario para esta parcela hoy.",
        existingReportId: existing.id,
        previewUrl: `/reports/${existing.id}`,
        quota: await this.fullQuota(input.authority.orgId, planSlug),
      };
    }

    const buckets = await resolveReportQuota(this.reports, input.authority.orgId, planSlug);
    if (buckets.daily.remaining <= 0 || buckets.daily.limit === 0) {
      return {
        ok: false as const,
        reason: "daily_quota_exceeded" as const,
        message: `Cuota mensual de briefings diarios alcanzada (${buckets.daily.used}/${buckets.daily.limit}).`,
        quota: await this.fullQuota(input.authority.orgId, planSlug),
      };
    }

    const built = await this.dailyBuilder.execute({
      authority: input.authority,
      parcelId: input.parcelId,
      reportDay,
    });

    if ("ok" in built) {
      return { ok: false as const, reason: "missing_parcel_access" as const, message: built.message };
    }

    const pdfBuffer = await this.pdf.render(built.htmlContent);

    const saved = await this.reports.saveReport({
      orgId: input.authority.orgId,
      createdByUserId: input.authority.userId,
      reportType: "daily_briefing",
      status: "ready",
      title: built.title,
      parcelId: built.parcelId,
      reportDay: built.reportDay,
      billingMonth,
      parentReportId: built.parentReportId,
      contextSnapshot: built.contextSnapshot,
      htmlContent: built.htmlContent,
      pdfBase64: pdfBuffer.toString("base64"),
    });

    return {
      ok: true as const,
      report: saved,
      quota: await this.fullQuota(input.authority.orgId, planSlug),
    };
  }

  private async fullQuota(orgId: string, planSlug: string): Promise<ReportQuotaUsage> {
    const buckets = await resolveReportQuota(this.reports, orgId, planSlug);
    return {
      ...buckets,
      planSlug,
      plusEnabled: true,
    };
  }
}

export class GetOrgReport {
  constructor(private readonly reports: ReportRegistry) {}

  async execute(orgId: string, reportId: string) {
    const report = await this.reports.getReportById(orgId, reportId);
    if (!report) {
      return { ok: false as const, reason: "report_not_found" as const };
    }
    return { ok: true as const, report };
  }
}
