import { describe, expect, it } from "vitest";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { NasaPowerWeatherSource } from "@/infrastructure/weather/nasa-power-weather-source";

const parcels = new SyntheticParcelRegistry();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("NasaPowerWeatherSource", () => {
  it("maps latest daily observation into evidence-complete result", async () => {
    const fetchFn = async () =>
      jsonResponse({
        header: { fill_value: -999 },
        properties: {
          parameter: {
            T2M: { "20260824": -999, "20260825": 21.5, "20260826": 22.4 },
            PRECTOTCORR: { "20260824": -999, "20260825": 0.2, "20260826": 0.0 },
          },
        },
      });

    const source = new NasaPowerWeatherSource(
      parcels,
      fetchFn,
      "https://power.larc.nasa.gov/api/temporal/daily/point",
      () => new Date("2026-08-26T18:00:00Z"),
    );
    const result = await source.getObservation("parcel-lima-norte-001");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.temperatureCelsius).toBe(22.4);
      expect(result.data.precipitationMm).toBe(0);
      expect(result.data.evidence.sourceId).toBe("nasa-power");
      expect(result.data.evidence.observedAt).toContain("2026-08-26");
      expect(result.data.evidence.spatialScope.label).toBe("parcel-lima-norte-001");
    }
  });

  it("WA-08: unknown payload fails safely without leaking raw content", async () => {
    const fetchFn = async () => jsonResponse({ error: "TRACE_DUMP_XYZ" });
    const source = new NasaPowerWeatherSource(parcels, fetchFn);
    const result = await source.getObservation("parcel-lima-norte-001");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("internal_error");
      expect(result.message).not.toContain("TRACE_DUMP_XYZ");
    }
  });
});
