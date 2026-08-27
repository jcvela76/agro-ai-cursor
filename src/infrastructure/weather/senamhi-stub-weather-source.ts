import type {
  WeatherEt0,
  WeatherEvidence,
  WeatherForecast,
  WeatherGdd,
  WeatherLowRainDays,
  WeatherObservation,
  WeatherRainfall30d,
  WeatherRainfallCampaignComparison,
  WeatherResult,
  WeatherSource,
} from "@/domain/weather/types";
import { OfflineWeatherSource } from "@/infrastructure/weather/offline-weather-source";

export const SENAMHI_STUB_SOURCE_ID = "senamhi-stub";
export const SENAMHI_STUB_SOURCE_LABEL =
  "SENAMHI (stub offline — no live API; contract pending)";

function remapEvidence(evidence: WeatherEvidence): WeatherEvidence {
  return {
    ...evidence,
    sourceId: SENAMHI_STUB_SOURCE_ID,
    sourceLabel: SENAMHI_STUB_SOURCE_LABEL,
    freshnessPolicy: "senamhi_stub_synthetic",
  };
}

/**
 * Offline paid-weather stub. Uses synthetic fixtures with SENAMHI provenance labels.
 * Does not call SENAMHI or any network. Live `WEATHER_SOURCE=senamhi` is rejected in the factory.
 */
export class SenamhiStubWeatherSource implements WeatherSource {
  constructor(private readonly inner: WeatherSource = new OfflineWeatherSource()) {}

  async getObservation(parcelId: string): Promise<WeatherResult<WeatherObservation>> {
    const result = await this.inner.getObservation(parcelId);
    if (!result.ok) {
      return result;
    }
    return {
      ok: true,
      data: { ...result.data, evidence: remapEvidence(result.data.evidence) },
    };
  }

  async getForecast(parcelId: string): Promise<WeatherResult<WeatherForecast>> {
    const result = await this.inner.getForecast(parcelId);
    if (!result.ok) {
      return result;
    }
    return {
      ok: true,
      data: { ...result.data, evidence: remapEvidence(result.data.evidence) },
    };
  }

  async getRainfall30d(parcelId: string): Promise<WeatherResult<WeatherRainfall30d>> {
    const result = await this.inner.getRainfall30d(parcelId);
    if (!result.ok) {
      return result;
    }
    return {
      ok: true,
      data: { ...result.data, evidence: remapEvidence(result.data.evidence) },
    };
  }

  async getRainfallCampaignComparison(
    parcelId: string,
  ): Promise<WeatherResult<WeatherRainfallCampaignComparison>> {
    const result = await this.inner.getRainfallCampaignComparison(parcelId);
    if (!result.ok) {
      return result;
    }
    return {
      ok: true,
      data: { ...result.data, evidence: remapEvidence(result.data.evidence) },
    };
  }

  async getLowRainDays(parcelId: string): Promise<WeatherResult<WeatherLowRainDays>> {
    const result = await this.inner.getLowRainDays(parcelId);
    if (!result.ok) {
      return result;
    }
    return {
      ok: true,
      data: { ...result.data, evidence: remapEvidence(result.data.evidence) },
    };
  }

  async getGdd(parcelId: string): Promise<WeatherResult<WeatherGdd>> {
    const result = await this.inner.getGdd(parcelId);
    if (!result.ok) {
      return result;
    }
    return {
      ok: true,
      data: { ...result.data, evidence: remapEvidence(result.data.evidence) },
    };
  }

  async getEt0(parcelId: string): Promise<WeatherResult<WeatherEt0>> {
    const result = await this.inner.getEt0(parcelId);
    if (!result.ok) {
      return result;
    }
    return {
      ok: true,
      data: { ...result.data, evidence: remapEvidence(result.data.evidence) },
    };
  }
}
