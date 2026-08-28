import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import { currentReportDayKey } from "@/domain/billing/plan-limits";
import type { ParcelRegistry } from "@/domain/parcel/types";
import type { DailyBriefingDeliveryPrefs } from "@/domain/report/daily-briefing-delivery";
import type { DailyBriefingDeliveryPrefsRegistry } from "@/domain/report/daily-briefing-delivery";
import type { GeneratedReport, ReportRegistry } from "@/domain/report/types";
import type { OrgMetadataStore } from "@/domain/workspace/types";
import type { GenerateOrgReport } from "@/application/report/report-use-cases";
import type { EmailSender } from "@/infrastructure/email/email-sender";

const CRON_USER_ID = "system:daily-briefing-cron";

export interface DailyBriefingDeliveryParcelResult {
  parcelId: string;
  parcelName: string;
  reportId: string | null;
  generated: boolean;
  emailed: boolean;
  skippedReason?: string;
  error?: string;
}

export interface DailyBriefingDeliveryOrgResult {
  orgId: string;
  parcels: DailyBriefingDeliveryParcelResult[];
}

export interface RunDailyBriefingDeliveryResult {
  reportDay: string;
  orgsProcessed: number;
  results: DailyBriefingDeliveryOrgResult[];
}

function resolveAppBaseUrl(): string {
  const explicit = process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

function buildEmailContent(input: {
  parcelName: string;
  reportDay: string;
  previewUrl: string;
  pdfUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Briefing diario · ${input.parcelName} · ${input.reportDay}`;
  const text = [
    `Briefing diario — ${input.parcelName} (${input.reportDay})`,
    "",
    `Ver informe: ${input.previewUrl}`,
    `Descargar PDF: ${input.pdfUrl}`,
    "",
    "Orientación basada en evidencia (WQ-18). Decisión operativa: agrónomo.",
    "— Agro AI",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="es">
<body style="font-family:system-ui,sans-serif;color:#1c2a1f;line-height:1.45">
  <h1 style="font-size:18px">Briefing diario · ${escapeHtml(input.parcelName)}</h1>
  <p>Día <strong>${escapeHtml(input.reportDay)}</strong> (America/Lima).</p>
  <p>
    <a href="${escapeHtml(input.previewUrl)}">Abrir informe</a>
    ·
    <a href="${escapeHtml(input.pdfUrl)}">Descargar PDF</a>
  </p>
  <p style="color:#5c6b5f;font-size:12px">
    Orientación basada en evidencia (WQ-18). Decisión operativa: agrónomo.
  </p>
  <p style="color:#5c6b5f;font-size:11px">— Agro AI</p>
</body>
</html>`;

  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export class RunDailyBriefingDelivery {
  constructor(
    private readonly prefs: DailyBriefingDeliveryPrefsRegistry,
    private readonly parcels: ParcelRegistry,
    private readonly reports: ReportRegistry,
    private readonly metadataStore: OrgMetadataStore,
    private readonly generateReport: GenerateOrgReport,
    private readonly email: EmailSender,
  ) {}

  async execute(options?: { now?: Date }): Promise<RunDailyBriefingDeliveryResult> {
    const now = options?.now ?? new Date();
    const reportDay = currentReportDayKey(now);
    const enabled = await this.prefs.listEnabled();
    const results: DailyBriefingDeliveryOrgResult[] = [];

    for (const pref of enabled) {
      results.push(await this.processOrg(pref, reportDay));
    }

    return {
      reportDay,
      orgsProcessed: results.length,
      results,
    };
  }

  private async processOrg(
    pref: DailyBriefingDeliveryPrefs,
    reportDay: string,
  ): Promise<DailyBriefingDeliveryOrgResult> {
    const settings = await this.metadataStore.getPublicMetadata(pref.orgId);
    if (!settings.entitlements.includes("weather_plus")) {
      return {
        orgId: pref.orgId,
        parcels: [
          {
            parcelId: "*",
            parcelName: "*",
            reportId: null,
            generated: false,
            emailed: false,
            skippedReason: "missing_plus_entitlement",
          },
        ],
      };
    }

    if (!pref.channels.includes("email") || pref.emailRecipients.length === 0) {
      return {
        orgId: pref.orgId,
        parcels: [
          {
            parcelId: "*",
            parcelName: "*",
            reportId: null,
            generated: false,
            emailed: false,
            skippedReason: "no_email_recipients",
          },
        ],
      };
    }

    const authority: AccessSnapshot = {
      userId: CRON_USER_ID,
      orgId: pref.orgId,
      isActiveMember: true,
      entitlements: settings.entitlements,
      authorizedParcelIds: settings.authorizedParcelIds,
    };

    const allParcels = await this.parcels.listByOrgId(pref.orgId);
    const selected =
      pref.parcelIds.length > 0
        ? allParcels.filter((p) => pref.parcelIds.includes(p.id))
        : allParcels;

    const parcelResults: DailyBriefingDeliveryParcelResult[] = [];
    const baseUrl = resolveAppBaseUrl();

    for (const parcel of selected) {
      try {
        const existing = await this.reports.findReadyDailyBriefing(
          pref.orgId,
          parcel.id,
          reportDay,
        );

        let report: GeneratedReport | null = existing;
        let generated = false;

        if (!report) {
          const gen = await this.generateReport.execute({
            authority,
            reportType: "daily_briefing",
            parcelId: parcel.id,
          });
          if (!gen.ok) {
            parcelResults.push({
              parcelId: parcel.id,
              parcelName: parcel.name,
              reportId: "existingReportId" in gen ? (gen.existingReportId ?? null) : null,
              generated: false,
              emailed: false,
              skippedReason: gen.reason,
              error: gen.message,
            });
            continue;
          }
          report = gen.report;
          generated = true;
        }

        const previewUrl = `${baseUrl}/reports/${report.id}`;
        const pdfUrl = `${baseUrl}/api/reports/${report.id}/pdf`;
        const content = buildEmailContent({
          parcelName: parcel.name,
          reportDay,
          previewUrl,
          pdfUrl,
        });

        const sent = await this.email.send({
          to: pref.emailRecipients,
          subject: content.subject,
          html: content.html,
          text: content.text,
        });

        parcelResults.push({
          parcelId: parcel.id,
          parcelName: parcel.name,
          reportId: report.id,
          generated,
          emailed: sent.ok,
          error: sent.ok ? undefined : sent.error,
        });
      } catch (error) {
        parcelResults.push({
          parcelId: parcel.id,
          parcelName: parcel.name,
          reportId: null,
          generated: false,
          emailed: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { orgId: pref.orgId, parcels: parcelResults };
  }
}
