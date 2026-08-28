import { authorizeWeatherPlusAccess } from "@/domain/auth/authorize-weather-access";
import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import {
  currentBillingMonthKey,
  inferPlanSlugForQuota,
  reportQuotaUsage,
} from "@/domain/billing/plan-limits";
import type { ReportQuotaUsage, ReportRegistry, ReportType } from "@/domain/report/types";
import type { OrgMetadataStore } from "@/domain/workspace/types";
import type { BuildReportContent } from "@/application/report/build-report-content";
import type { PdfRenderer } from "@/infrastructure/report/stub-pdf-renderer";

export class GetReportQuota {
  constructor(
    private readonly reports: ReportRegistry,
    private readonly metadataStore: OrgMetadataStore,
  ) {}

  async execute(authority: AccessSnapshot | null): Promise<ReportQuotaUsage> {
    const billingMonth = currentBillingMonthKey();
    const plusEnabled = authorizeWeatherPlusAccess(authority);

    if (!authority || !plusEnabled) {
      return {
        limit: 0,
        used: 0,
        remaining: 0,
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
    const used = await this.reports.countReportsInBillingMonth(authority.orgId, billingMonth);
    const quota = reportQuotaUsage({ used, planSlug });

    return {
      ...quota,
      billingMonth,
      planSlug,
      plusEnabled: true,
    };
  }
}

export class GenerateOrgReport {
  constructor(
    private readonly reports: ReportRegistry,
    private readonly builder: BuildReportContent,
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
    const used = await this.reports.countReportsInBillingMonth(input.authority.orgId, billingMonth);
    const quota = reportQuotaUsage({ used, planSlug });

    if (quota.blocked || quota.limit === 0) {
      return {
        ok: false as const,
        reason: "quota_exceeded" as const,
        message: `Cuota mensual alcanzada (${quota.used}/${quota.limit} informes).`,
        quota,
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

    const content = built;
    const pdfBuffer = await this.pdf.render(content.htmlContent);

    const saved = await this.reports.saveReport({
      orgId: input.authority.orgId,
      createdByUserId: input.authority.userId,
      reportType: input.reportType,
      title: content.title,
      parcelId: content.parcelId,
      lotId: content.lotId,
      billingMonth,
      htmlContent: content.htmlContent,
      pdfBase64: pdfBuffer.toString("base64"),
    });

    return {
      ok: true as const,
      report: saved,
      quota: reportQuotaUsage({ used: used + 1, planSlug }),
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
