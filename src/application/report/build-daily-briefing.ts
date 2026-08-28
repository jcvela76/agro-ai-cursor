import { currentReportDayKey } from "@/domain/billing/plan-limits";
import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import type { DailyBriefingContextSnapshot } from "@/domain/report/daily-briefing";
import { buildDailyBriefingDeltas } from "@/domain/report/daily-briefing";
import type { ReportRegistry } from "@/domain/report/types";
import type { CollectParcelSignals } from "@/application/report/collect-parcel-signals";
import { synthesizeDailyBriefingNarrative } from "@/application/report/synthesize-daily-briefing";
import { renderDailyBriefingHtml } from "@/reports/render-daily-briefing-html";

export interface BuiltDailyBriefingContent {
  title: string;
  htmlContent: string;
  parcelId: string;
  reportDay: string;
  parentReportId: string | null;
  contextSnapshot: DailyBriefingContextSnapshot;
}

export type BuildDailyBriefingResult =
  | BuiltDailyBriefingContent
  | { ok: false; message: string };

export class BuildDailyBriefing {
  constructor(
    private readonly reports: ReportRegistry,
    private readonly collector: CollectParcelSignals,
  ) {}

  async execute(input: {
    authority: AccessSnapshot;
    parcelId: string;
    reportDay?: string;
  }): Promise<BuildDailyBriefingResult> {
    const reportDay = input.reportDay ?? currentReportDayKey();
    const collected = await this.collector.execute({
      authority: input.authority,
      parcelId: input.parcelId,
    });
    if ("ok" in collected) {
      return { ok: false, message: collected.message };
    }

    const previous = await this.reports.getLatestReadyDailyBriefing(
      input.authority.orgId,
      input.parcelId,
      reportDay,
    );
    const previousSnapshot = previous?.contextSnapshot ?? null;

    const narrative = await synthesizeDailyBriefingNarrative({
      parcelName: collected.parcelName,
      reportDay,
      signals: collected.signals,
      previous: previousSnapshot,
    });

    const deltas = buildDailyBriefingDeltas(collected.signals, previousSnapshot?.signals);
    const generatedAt = new Intl.DateTimeFormat("es-PE", {
      timeZone: "America/Lima",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date());

    const contextSnapshot: DailyBriefingContextSnapshot = {
      reportDay,
      parcelId: collected.parcelId,
      parcelName: collected.parcelName,
      signals: collected.signals,
      suggestions: narrative.suggestions,
      openQuestions: [
        "¿Con qué frecuencia se riega esta parcela?",
        "¿Qué cultivo y fecha de siembra tiene la parcela?",
      ],
      limits: [
        "ET0 ≠ riego aplicado",
        "NDWI/NDMI no miden humedad de suelo directa",
        "Decisión operativa: agrónomo",
      ],
    };

    const htmlContent = renderDailyBriefingHtml({
      title: `Briefing diario · ${collected.parcelName}`,
      parcelName: collected.parcelName,
      reportDay,
      summaryMarkdown: narrative.summaryMarkdown,
      deltas,
      evidenceRows: collected.evidenceRows,
      previousReportDay: previousSnapshot?.reportDay ?? null,
      generatedAt,
    });

    return {
      title: `Briefing diario · ${collected.parcelName}`,
      htmlContent,
      parcelId: collected.parcelId,
      reportDay,
      parentReportId: previous?.id ?? null,
      contextSnapshot,
    };
  }
}
