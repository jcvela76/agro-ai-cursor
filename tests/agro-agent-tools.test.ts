import { describe, expect, it } from "vitest";
import { createAgroAgentTools, isPlusToolAllowed } from "@/agents/agro-agent/tools";
import { GetParcelWeatherForecast, GetParcelWeatherObservation } from "@/application/weather/get-parcel-weather";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineWeatherSource } from "@/infrastructure/weather/offline-weather-source";

describe("WA-07 Plus gate for Agro Agent", () => {
  it("denies base weather user without weather_plus", () => {
    expect(isPlusToolAllowed({ authority: defaultSyntheticSnapshots[0] })).toBe(false);
  });

  it("allows Plus-entitled user", () => {
    expect(isPlusToolAllowed({ authority: defaultSyntheticSnapshots[4] })).toBe(true);
  });
});

describe("Agro Agent weather tools", () => {
  const registry = new SyntheticParcelRegistry();
  const source = new OfflineWeatherSource();
  const observation = new GetParcelWeatherObservation(registry, source);
  const forecast = new GetParcelWeatherForecast(registry, source);
  const authority = defaultSyntheticSnapshots[4];

  it("returns observation evidence for authorized parcel", async () => {
    const tools = createAgroAgentTools({
      authority,
      parcelId: "parcel-lima-norte-001",
      observation,
      forecast,
    });
    const result = (await tools.getParcelWeatherObservation.execute!(
      {},
      { toolCallId: "t1", messages: [] },
    )) as Awaited<ReturnType<NonNullable<typeof tools.getParcelWeatherObservation.execute>>>;
    expect(result).toMatchObject({ ok: true });
    if ("ok" in result && result.ok) {
      expect(result.data.kind).toBe("observation");
      expect(result.data.evidence.sourceId).toBeTruthy();
    }
  });

  it("returns forecast for authorized parcel", async () => {
    const tools = createAgroAgentTools({
      authority,
      parcelId: "parcel-lima-norte-001",
      observation,
      forecast,
    });
    const result = (await tools.getParcelWeatherForecast.execute!(
      {},
      { toolCallId: "t2", messages: [] },
    )) as Awaited<ReturnType<NonNullable<typeof tools.getParcelWeatherForecast.execute>>>;
    expect(result).toMatchObject({ ok: true });
    if ("ok" in result && result.ok) {
      expect(result.data.kind).toBe("forecast");
      expect(result.data.days.length).toBeGreaterThan(0);
    }
  });
});
