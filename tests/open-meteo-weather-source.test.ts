import { describe, expect, it } from "vitest";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OpenMeteoWeatherSource } from "@/infrastructure/weather/open-meteo-weather-source";

const parcels = new SyntheticParcelRegistry();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("OpenMeteoWeatherSource", () => {
  it("maps daily forecast into evidence-complete result", async () => {
    const fetchFn = async () =>
      jsonResponse({
        timezone: "America/Lima",
        daily: {
          time: ["2026-08-27", "2026-08-28"],
          temperature_2m_max: [24.8, 23.5],
          temperature_2m_min: [16.2, 15.9],
          precipitation_sum: [2.1, 0.4],
          precipitation_probability_max: [35, 12],
        },
      });

    const source = new OpenMeteoWeatherSource(parcels, fetchFn);
    const result = await source.getForecast("parcel-lima-norte-001");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.days).toHaveLength(2);
      expect(result.data.days[0].tempMaxCelsius).toBe(24.8);
      expect(result.data.evidence.sourceId).toBe("open-meteo");
      expect(result.data.evidence.timezone).toBe("America/Lima");
      expect(result.data.evidence.spatialScope.label).toBe("parcel-lima-norte-001");
    }
  });

  it("WA-08: unknown payload fails safely without leaking raw content", async () => {
    const fetchFn = async () => jsonResponse({ weird: true, raw_error: "SECRET_STACK" });
    const source = new OpenMeteoWeatherSource(parcels, fetchFn);
    const result = await source.getForecast("parcel-lima-norte-001");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("internal_error");
      expect(result.message).not.toContain("SECRET_STACK");
      expect(result.message).toBe("Weather provider returned an unexpected payload.");
    }
  });
});
