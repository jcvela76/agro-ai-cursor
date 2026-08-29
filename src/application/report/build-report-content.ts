import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import { authorizeWeatherAccess } from "@/domain/auth/authorize-weather-access";
import type { Parcel } from "@/domain/parcel/types";
import type { ParcelRegistry } from "@/domain/parcel/types";
import type { ReportType } from "@/domain/report/types";
import type { TraceLotRegistry } from "@/domain/traceability/types";
import { evaluateEudrExportReadiness } from "@/domain/traceability/types";
import type { GetParcelWeatherEt0 } from "@/application/weather/get-parcel-et0";
import type { GetParcelWeatherForecast } from "@/application/weather/get-parcel-weather";
import type { GetParcelWeatherObservation } from "@/application/weather/get-parcel-weather";
import type { GetParcelWeatherGdd } from "@/application/weather/get-parcel-gdd";
import type { GetParcelWeatherRainfall30d } from "@/application/weather/get-parcel-rainfall-30d";
import type { GetParcelVegetationIndices } from "@/application/spectral/get-parcel-vegetation-indices";
import type { GetParcelSpectralZones } from "@/application/spectral/get-parcel-spectral-zones";
import {
  pickZoneExtremes,
  zoneExtremesBullet,
  zoneExtremesEvidenceRows,
} from "@/domain/spectral/zone-report-summary";
import { renderAgentBriefingHtml, renderReportHtml } from "@/reports/render-report-html";

export interface BuildReportContentInput {
  reportType: ReportType;
  authority: AccessSnapshot;
  parcelId?: string;
  lotId?: string;
  agentQuestion?: string;
  agentAnswerMarkdown?: string;
}

export interface BuiltReportContent {
  title: string;
  htmlContent: string;
  parcelId: string | null;
  lotId: string | null;
}

export type BuildReportResult = BuiltReportContent | { ok: false; message: string };

export class BuildReportContent {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly traceLots: TraceLotRegistry,
    private readonly observation: GetParcelWeatherObservation,
    private readonly forecast: GetParcelWeatherForecast,
    private readonly rainfall30d: GetParcelWeatherRainfall30d,
    private readonly gdd: GetParcelWeatherGdd,
    private readonly et0: GetParcelWeatherEt0,
    private readonly vegetation: GetParcelVegetationIndices,
    private readonly spectralZones: GetParcelSpectralZones,
  ) {}

  async execute(input: BuildReportContentInput): Promise<BuildReportResult> {
    const generatedAt = new Intl.DateTimeFormat("es-PE", {
      timeZone: "America/Lima",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date());

    switch (input.reportType) {
      case "weather_climate":
        return this.buildWeatherClimate(input, generatedAt);
      case "water_balance":
        return this.buildWaterBalance(input, generatedAt);
      case "agent_briefing":
        return this.buildAgentBriefing(input, generatedAt);
      case "trace_lot_dossier":
        return this.buildTraceDossier(input, generatedAt);
      default:
        return { ok: false, message: "Tipo de informe no soportado." };
    }
  }

  private async resolveParcel(
    authority: AccessSnapshot,
    parcelId: string,
  ): Promise<Parcel | null> {
    const parcel = await this.parcels.getParcel(parcelId);
    if (!parcel) {
      return null;
    }
    const access = authorizeWeatherAccess(authority, parcelId, parcel.orgId);
    return access.ok ? parcel : null;
  }

  private async buildWeatherClimate(
    input: BuildReportContentInput,
    generatedAt: string,
  ): Promise<BuildReportResult> {
    if (!input.parcelId) {
      return { ok: false, message: "parcelId requerido." };
    }
    const parcel = await this.resolveParcel(input.authority, input.parcelId);
    if (!parcel) {
      return { ok: false, message: "Parcela no accesible." };
    }

    const authInput = { authority: input.authority, parcelId: input.parcelId };
    const [obs, fc, rain, gddRes, et0Res] = await Promise.all([
      this.observation.execute(authInput),
      this.forecast.execute(authInput),
      this.rainfall30d.execute(authInput),
      this.gdd.execute(authInput),
      this.et0.execute(authInput),
    ]);

    const rows: Array<{ signal: string; value: string; source: string; validity: string }> = [];
    const summaryParts: string[] = ["<h2>Resumen</h2><ul>"];

    if (obs.ok) {
      rows.push({
        signal: "Temperatura",
        value: `${obs.data.temperatureCelsius.toFixed(1)} °C`,
        source: obs.data.evidence.sourceLabel,
        validity: obs.data.evidence.observedAt ?? "—",
      });
      rows.push({
        signal: "Precipitación obs.",
        value: `${obs.data.precipitationMm.toFixed(1)} mm`,
        source: obs.data.evidence.sourceLabel,
        validity: obs.data.evidence.observedAt ?? "—",
      });
      summaryParts.push(
        `<li>Observación: ${obs.data.temperatureCelsius.toFixed(1)} °C, ${obs.data.precipitationMm.toFixed(1)} mm precip.</li>`,
      );
    }

    if (fc.ok) {
      for (const day of fc.data.days.slice(0, 7)) {
        rows.push({
          signal: `Pronóstico ${day.date}`,
          value: `${day.tempMinCelsius.toFixed(0)}–${day.tempMaxCelsius.toFixed(0)} °C · ${day.precipitationMm.toFixed(1)} mm`,
          source: fc.data.evidence.sourceLabel,
          validity: day.date,
        });
      }
      summaryParts.push(
        `<li>Pronóstico ${fc.data.days.length} días hasta ${fc.data.evidence.validTo ?? "—"}</li>`,
      );
    }

    if (rain.ok) {
      rows.push({
        signal: "Lluvia 30d",
        value: `${rain.data.totalPrecipitationMm.toFixed(1)} mm`,
        source: rain.data.evidence.sourceLabel,
        validity: `${rain.data.periodStart} – ${rain.data.periodEnd}`,
      });
      summaryParts.push(`<li>Lluvia 30d: ${rain.data.totalPrecipitationMm.toFixed(1)} mm</li>`);
    }

    if (gddRes.ok) {
      rows.push({
        signal: "GDD YTD",
        value: `${gddRes.data.totalGdd.toFixed(0)} °C·d`,
        source: gddRes.data.evidence.sourceLabel,
        validity: `${gddRes.data.periodStart} – ${gddRes.data.periodEnd}`,
      });
    }

    if (et0Res.ok) {
      rows.push({
        signal: "ET0 YTD",
        value: `${et0Res.data.totalEt0Mm.toFixed(1)} mm`,
        source: et0Res.data.evidence.sourceLabel,
        validity: `${et0Res.data.periodStart} – ${et0Res.data.periodEnd}`,
      });
    }

    summaryParts.push("</ul>");

    const htmlContent = renderReportHtml({
      title: "Informe climático de parcela",
      subtitle: parcel.name,
      parcelName: parcel.name,
      summaryHtml: summaryParts.join("\n"),
      evidenceRows: rows,
      limitsHtml: "Pronóstico acotado al horizonte de la fuente. ET0 ≠ riego aplicado.",
      generatedAt,
    });

    return {
      title: `Clima · ${parcel.name}`,
      htmlContent,
      parcelId: parcel.id,
      lotId: null,
    };
  }

  private async buildWaterBalance(
    input: BuildReportContentInput,
    generatedAt: string,
  ): Promise<BuildReportResult> {
    if (!input.parcelId) {
      return { ok: false, message: "parcelId requerido." };
    }
    const parcel = await this.resolveParcel(input.authority, input.parcelId);
    if (!parcel) {
      return { ok: false, message: "Parcela no accesible." };
    }

    const authInput = { authority: input.authority, parcelId: input.parcelId };
    const [obs, fc, rain, et0Res, veg] = await Promise.all([
      this.observation.execute(authInput),
      this.forecast.execute(authInput),
      this.rainfall30d.execute(authInput),
      this.et0.execute(authInput),
      this.vegetation.execute(authInput),
    ]);

    const rows: Array<{ signal: string; value: string; source: string; validity: string }> = [];
    const bullets: string[] = [];

    if (obs.ok) {
      rows.push({
        signal: "Temperatura",
        value: `${obs.data.temperatureCelsius.toFixed(1)} °C`,
        source: obs.data.evidence.sourceLabel,
        validity: obs.data.evidence.observedAt ?? "—",
      });
      rows.push({
        signal: "Precipitación obs.",
        value: `${obs.data.precipitationMm.toFixed(1)} mm`,
        source: obs.data.evidence.sourceLabel,
        validity: obs.data.evidence.observedAt ?? "—",
      });
    }

    if (fc.ok) {
      const dryDays = fc.data.days.filter((d) => d.precipitationMm <= 0).length;
      bullets.push(`Pronóstico: ${dryDays} días sin lluvia esperada hasta ${fc.data.evidence.validTo ?? "—"}.`);
      for (const day of fc.data.days.slice(0, 7)) {
        rows.push({
          signal: `Pronóstico ${day.date}`,
          value: `${day.precipitationMm.toFixed(1)} mm`,
          source: fc.data.evidence.sourceLabel,
          validity: day.date,
        });
      }
    }

    if (rain.ok) {
      bullets.push(`Lluvia 30d: ${rain.data.totalPrecipitationMm.toFixed(1)} mm.`);
      rows.push({
        signal: "Lluvia 30d",
        value: `${rain.data.totalPrecipitationMm.toFixed(1)} mm`,
        source: rain.data.evidence.sourceLabel,
        validity: `${rain.data.periodStart} – ${rain.data.periodEnd}`,
      });
    }

    if (et0Res.ok) {
      bullets.push(`ET0 campaña: ${et0Res.data.totalEt0Mm.toFixed(0)} mm (referencia).`);
      rows.push({
        signal: "ET0 YTD",
        value: `${et0Res.data.totalEt0Mm.toFixed(1)} mm`,
        source: et0Res.data.evidence.sourceLabel,
        validity: `${et0Res.data.periodStart} – ${et0Res.data.periodEnd}`,
      });
    }

    if (veg.ok) {
      const ndwi = veg.data.indices.find((i) => i.id === "ndwi");
      const ndmi = veg.data.indices.find((i) => i.id === "ndmi");
      if (ndwi?.value != null) {
        rows.push({
          signal: "NDWI",
          value: ndwi.value.toFixed(3),
          source: veg.data.evidence.sourceLabel,
          validity: veg.data.acquisitionDate,
        });
        bullets.push(`NDWI ${ndwi.value.toFixed(2)} (${ndwi.description}).`);
      }
      if (ndmi?.value != null) {
        rows.push({
          signal: "NDMI",
          value: ndmi.value.toFixed(3),
          source: veg.data.evidence.sourceLabel,
          validity: veg.data.acquisitionDate,
        });
      }

      const zonesResult = await this.spectralZones.execute({
        ...authInput,
        indexId: "ndwi",
      });
      if (zonesResult.ok) {
        const extremes = pickZoneExtremes(zonesResult.data);
        const source = zonesResult.data.evidence.sourceLabel;
        const validity = zonesResult.data.evidence.acquiredAt.slice(0, 10);
        rows.push(...zoneExtremesEvidenceRows(extremes, source, validity));
        const zoneBullet = zoneExtremesBullet(extremes);
        if (zoneBullet) {
          bullets.push(zoneBullet);
        }
      }
    }

    const summaryHtml = `<h2>Resumen</h2><ul>${bullets.map((b) => `<li>${b}</li>`).join("")}</ul><p>La evidencia sugiere revisar condiciones en campo antes de decidir riego.</p>`;

    const htmlContent = renderReportHtml({
      title: "Informe hídrico indicativo",
      subtitle: parcel.name,
      parcelName: parcel.name,
      summaryHtml,
      evidenceRows: rows,
      limitsHtml:
        "ET0 ≠ riego aplicado; NDWI/NDMI no miden humedad de suelo directa. Zonas = medias relativas dentro de la parcela (fishnet), no umbrales agronómicos absolutos. Decisión: agrónomo.",
      generatedAt,
    });

    return {
      title: `Hídrico · ${parcel.name}`,
      htmlContent,
      parcelId: parcel.id,
      lotId: null,
    };
  }

  private async buildAgentBriefing(
    input: BuildReportContentInput,
    generatedAt: string,
  ): Promise<BuildReportResult> {
    if (!input.parcelId || !input.agentQuestion?.trim() || !input.agentAnswerMarkdown?.trim()) {
      return { ok: false, message: "Pregunta y respuesta del agente requeridas." };
    }
    const parcel = await this.resolveParcel(input.authority, input.parcelId);
    if (!parcel) {
      return { ok: false, message: "Parcela no accesible." };
    }

    const htmlContent = renderAgentBriefingHtml({
      title: "Briefing Agro Agent",
      parcelName: parcel.name,
      question: input.agentQuestion.trim(),
      answerMarkdown: input.agentAnswerMarkdown.trim(),
      generatedAt,
    });

    return {
      title: `Agente · ${parcel.name}`,
      htmlContent,
      parcelId: parcel.id,
      lotId: null,
    };
  }

  private async buildTraceDossier(
    input: BuildReportContentInput,
    generatedAt: string,
  ): Promise<BuildReportResult> {
    if (!input.lotId) {
      return { ok: false, message: "lotId requerido." };
    }
    const view = await this.traceLots.getLotView(input.lotId);
    if (!view || view.lot.orgId !== input.authority.orgId) {
      return { ok: false, message: "Lote no accesible." };
    }

    const eudr = evaluateEudrExportReadiness(view);
    const rows: Array<{ signal: string; value: string; source: string; validity: string }> =
      view.events.map((event) => ({
      signal: event.eventType,
      value: event.occurredAt.slice(0, 10),
      source: event.actorId,
      validity: event.evidenceRef ?? "—",
    }));

    rows.unshift({
      signal: "EUDR export ready",
      value: eudr.ok ? "Sí" : "No",
      source: "Traceability",
      validity: view.lot.status,
    });

    for (const link of view.parcelLinks) {
      rows.push({
        signal: "Parcela vinculada",
        value: link.parcelId,
        source: "Parcel Core",
        validity: link.linkedAt.slice(0, 10),
      });
    }

    const summaryHtml = `<h2>Resumen</h2><ul>
<li>Lote: ${view.lot.name} (${view.lot.cropType}, ${view.lot.harvestSeason})</li>
<li>Productor: ${view.lot.producerName || "—"}</li>
<li>País: ${view.lot.countryOfProduction}</li>
<li>Estado: ${view.lot.status}</li>
<li>EUDR: ${eudr.ok ? "completo" : `incompleto (${eudr.missing.join(", ")})`}</li>
</ul>`;

    const htmlContent = renderReportHtml({
      title: "Dossier lote coffee (EUDR)",
      subtitle: view.lot.name,
      summaryHtml,
      evidenceRows: rows,
      limitsHtml: "Documento piloto interno; no sustituye verificación regulatoria.",
      generatedAt,
    });

    return {
      title: `Trace · ${view.lot.name}`,
      htmlContent,
      parcelId: view.parcelLinks[0]?.parcelId ?? null,
      lotId: view.lot.id,
    };
  }
}
