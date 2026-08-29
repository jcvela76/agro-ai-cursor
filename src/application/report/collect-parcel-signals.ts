import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import { authorizeWeatherAccess } from "@/domain/auth/authorize-weather-access";
import type { DailyBriefingSignal } from "@/domain/report/daily-briefing";
import type { ParcelRegistry } from "@/domain/parcel/types";
import type { GetParcelWeatherEt0 } from "@/application/weather/get-parcel-et0";
import type { GetParcelWeatherForecast } from "@/application/weather/get-parcel-weather";
import type { GetParcelWeatherObservation } from "@/application/weather/get-parcel-weather";
import type { GetParcelWeatherRainfall30d } from "@/application/weather/get-parcel-rainfall-30d";
import type { GetParcelVegetationIndices } from "@/application/spectral/get-parcel-vegetation-indices";
import type { GetParcelSpectralZones } from "@/application/spectral/get-parcel-spectral-zones";
import {
  pickZoneExtremes,
  zoneExtremesBriefingSignals,
  zoneExtremesEvidenceRows,
} from "@/domain/spectral/zone-report-summary";

export interface ParcelEvidenceRow {
  signal: string;
  value: string;
  source: string;
  validity: string;
}

export interface CollectedParcelSignals {
  parcelId: string;
  parcelName: string;
  signals: DailyBriefingSignal[];
  evidenceRows: ParcelEvidenceRow[];
}

export class CollectParcelSignals {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly observation: GetParcelWeatherObservation,
    private readonly forecast: GetParcelWeatherForecast,
    private readonly rainfall30d: GetParcelWeatherRainfall30d,
    private readonly et0: GetParcelWeatherEt0,
    private readonly vegetation: GetParcelVegetationIndices,
    private readonly spectralZones: GetParcelSpectralZones,
  ) {}

  async execute(input: {
    authority: AccessSnapshot;
    parcelId: string;
  }): Promise<CollectedParcelSignals | { ok: false; message: string }> {
    const parcel = await this.parcels.getParcel(input.parcelId);
    if (!parcel) {
      return { ok: false, message: "Parcela no accesible." };
    }
    const access = authorizeWeatherAccess(input.authority, input.parcelId, parcel.orgId);
    if (!access.ok) {
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

    const signals: DailyBriefingSignal[] = [];
    const evidenceRows: ParcelEvidenceRow[] = [];

    if (obs.ok) {
      signals.push({
        id: "temp_obs",
        label: "Temperatura observada",
        value: Number(obs.data.temperatureCelsius.toFixed(1)),
        unit: "°C",
        source: obs.data.evidence.sourceLabel,
        validity: obs.data.evidence.observedAt ?? "—",
      });
      signals.push({
        id: "rain_obs",
        label: "Precipitación observada",
        value: Number(obs.data.precipitationMm.toFixed(1)),
        unit: "mm",
        source: obs.data.evidence.sourceLabel,
        validity: obs.data.evidence.observedAt ?? "—",
      });
      evidenceRows.push(
        {
          signal: "Temperatura",
          value: `${obs.data.temperatureCelsius.toFixed(1)} °C`,
          source: obs.data.evidence.sourceLabel,
          validity: obs.data.evidence.observedAt ?? "—",
        },
        {
          signal: "Precipitación obs.",
          value: `${obs.data.precipitationMm.toFixed(1)} mm`,
          source: obs.data.evidence.sourceLabel,
          validity: obs.data.evidence.observedAt ?? "—",
        },
      );
    }

    if (fc.ok) {
      const dryDays = fc.data.days.filter((d) => d.precipitationMm <= 0).length;
      signals.push({
        id: "forecast_dry_days",
        label: "Días sin lluvia (pronóstico)",
        value: dryDays,
        unit: "días",
        source: fc.data.evidence.sourceLabel,
        validity: `hasta ${fc.data.evidence.validTo ?? "—"}`,
      });
      for (const day of fc.data.days.slice(0, 7)) {
        evidenceRows.push({
          signal: `Pronóstico ${day.date}`,
          value: `${day.tempMinCelsius.toFixed(0)}–${day.tempMaxCelsius.toFixed(0)} °C · ${day.precipitationMm.toFixed(1)} mm`,
          source: fc.data.evidence.sourceLabel,
          validity: day.date,
        });
      }
    }

    if (rain.ok) {
      signals.push({
        id: "rain_30d",
        label: "Lluvia 30 días",
        value: Number(rain.data.totalPrecipitationMm.toFixed(1)),
        unit: "mm",
        source: rain.data.evidence.sourceLabel,
        validity: `${rain.data.periodStart} – ${rain.data.periodEnd}`,
      });
      evidenceRows.push({
        signal: "Lluvia 30d",
        value: `${rain.data.totalPrecipitationMm.toFixed(1)} mm`,
        source: rain.data.evidence.sourceLabel,
        validity: `${rain.data.periodStart} – ${rain.data.periodEnd}`,
      });
    }

    if (et0Res.ok) {
      signals.push({
        id: "et0_ytd",
        label: "ET0 campaña YTD",
        value: Number(et0Res.data.totalEt0Mm.toFixed(1)),
        unit: "mm",
        source: et0Res.data.evidence.sourceLabel,
        validity: `${et0Res.data.periodStart} – ${et0Res.data.periodEnd}`,
      });
      evidenceRows.push({
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
        signals.push({
          id: "ndwi",
          label: "NDWI",
          value: Number(ndwi.value.toFixed(3)),
          source: veg.data.evidence.sourceLabel,
          validity: veg.data.acquisitionDate,
        });
        evidenceRows.push({
          signal: "NDWI",
          value: ndwi.value.toFixed(3),
          source: veg.data.evidence.sourceLabel,
          validity: veg.data.acquisitionDate,
        });
      }
      if (ndmi?.value != null) {
        signals.push({
          id: "ndmi",
          label: "NDMI",
          value: Number(ndmi.value.toFixed(3)),
          source: veg.data.evidence.sourceLabel,
          validity: veg.data.acquisitionDate,
        });
        evidenceRows.push({
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
        signals.push(...zoneExtremesBriefingSignals(extremes, source, validity));
        evidenceRows.push(...zoneExtremesEvidenceRows(extremes, source, validity));
      }
    }

    return {
      parcelId: parcel.id,
      parcelName: parcel.name,
      signals,
      evidenceRows,
    };
  }
}
