import { describe, expect, it } from "vitest";
import {
  AppendParcelFieldNote,
  ListParcelFieldNotes,
} from "@/application/field-note/parcel-field-notes";
import { createAgroAgentTools } from "@/agents/agro-agent/tools";
import { GetParcelRecentBriefings } from "@/application/report/get-parcel-recent-briefings";
import {
  GetParcelAgronomicProfile,
  UpdateParcelAgronomicProfile,
} from "@/application/parcel/parcel-agronomic-profile";
import { GetParcelVegetationIndices } from "@/application/spectral/get-parcel-vegetation-indices";
import { GetParcelSpectralZones } from "@/application/spectral/get-parcel-spectral-zones";
import { GetParcelSpectralHistory } from "@/application/spectral/get-parcel-spectral-history";
import { GetParcelWeatherEt0 } from "@/application/weather/get-parcel-et0";
import { GetParcelWeatherGdd } from "@/application/weather/get-parcel-gdd";
import { GetParcelWeatherLowRainDays } from "@/application/weather/get-parcel-low-rain-days";
import { GetParcelWeatherRainfall30d } from "@/application/weather/get-parcel-rainfall-30d";
import { GetParcelWeatherRainfallCampaignComparison } from "@/application/weather/get-parcel-rainfall-campaign-comparison";
import {
  GetParcelWeatherForecast,
  GetParcelWeatherObservation,
} from "@/application/weather/get-parcel-weather";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";
import { OfflineParcelFieldNoteRegistry } from "@/infrastructure/field-note/offline-parcel-field-note-registry";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineParcelAgronomicProfileRegistry } from "@/infrastructure/parcel/offline-parcel-agronomic-profile-registry";
import { OfflineReportRegistry } from "@/infrastructure/report/offline-report-registry";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";
import { OfflineSpectralSceneRegistry } from "@/infrastructure/spectral/offline-spectral-scene-registry";
import { OfflineWeatherSource } from "@/infrastructure/weather/offline-weather-source";

describe("parcel field notes use cases", () => {
  const parcels = new SyntheticParcelRegistry();
  const notes = new OfflineParcelFieldNoteRegistry();
  const list = new ListParcelFieldNotes(parcels, notes);
  const append = new AppendParcelFieldNote(parcels, notes);
  const plus = defaultSyntheticSnapshots.find((s) => s.userId === "user-plus-005")!;
  const weatherOnly = defaultSyntheticSnapshots.find(
    (s) => s.userId === "user-agronomist-001",
  )!;
  const parcelId = "parcel-lima-norte-001";

  it("denies without Plus", async () => {
    const result = await list.execute({ authority: weatherOnly, parcelId });
    expect(result.ok).toBe(false);
  });

  it("appends and lists newest first", async () => {
    const first = await append.execute({
      authority: plus,
      parcelId,
      body: "Suelo seco a 10 cm en SO",
      zoneLabel: "SO",
      observedAt: "2026-08-20T10:00:00.000Z",
    });
    expect(first.ok).toBe(true);

    const second = await append.execute({
      authority: plus,
      parcelId,
      body: "Riego aplicado 2 h",
      observedAt: "2026-08-28T15:00:00.000Z",
    });
    expect(second.ok).toBe(true);

    const listed = await list.execute({ authority: plus, parcelId });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.data.length).toBeGreaterThanOrEqual(2);
    expect(listed.data[0]?.body).toBe("Riego aplicado 2 h");
    expect(listed.data[1]?.zoneLabel).toBe("SO");
  });

  it("rejects empty body", async () => {
    const result = await append.execute({
      authority: plus,
      parcelId,
      body: "   ",
    });
    expect(result.ok).toBe(false);
  });
});

describe("Agro Agent field note tools", () => {
  const registry = new SyntheticParcelRegistry();
  const source = new OfflineWeatherSource();
  const profiles = new OfflineParcelAgronomicProfileRegistry();
  const notes = new OfflineParcelFieldNoteRegistry();
  const listFieldNotes = new ListParcelFieldNotes(registry, notes);
  const appendFieldNote = new AppendParcelFieldNote(registry, notes);
  const authority = defaultSyntheticSnapshots[4];

  const tools = createAgroAgentTools({
    authority,
    parcelId: "parcel-lima-norte-001",
    observation: new GetParcelWeatherObservation(registry, source),
    forecast: new GetParcelWeatherForecast(registry, source),
    rainfall30d: new GetParcelWeatherRainfall30d(registry, source),
    rainfallCampaignComparison: new GetParcelWeatherRainfallCampaignComparison(
      registry,
      source,
      profiles,
    ),
    lowRainDays: new GetParcelWeatherLowRainDays(registry, source),
    gdd: new GetParcelWeatherGdd(registry, source, profiles),
    et0: new GetParcelWeatherEt0(registry, source, profiles),
    vegetationIndices: new GetParcelVegetationIndices(registry, new OfflineSpectralSource()),
    spectralZones: new GetParcelSpectralZones(registry, new OfflineSpectralSource()),
    spectralHistory: new GetParcelSpectralHistory(
      registry,
      new OfflineSpectralSceneRegistry(),
    ),
    recentBriefings: new GetParcelRecentBriefings(registry, new OfflineReportRegistry()),
    getProfile: new GetParcelAgronomicProfile(registry, profiles),
    updateProfile: new UpdateParcelAgronomicProfile(registry, profiles),
    listFieldNotes,
    appendFieldNote,
  });

  it("appends and lists via tools", async () => {
    const saved = (await tools.appendParcelFieldNote.execute!(
      { body: "Estrés visible borde NE", zoneLabel: "NE" },
      { toolCallId: "fn1", messages: [] },
    )) as { ok: boolean; data?: { body: string; zoneLabel: string | null } };
    expect(saved.ok).toBe(true);
    expect(saved.data?.zoneLabel).toBe("NE");

    const listed = (await tools.getParcelFieldNotes.execute!(
      { limit: 5 },
      { toolCallId: "fn2", messages: [] },
    )) as { ok: boolean; data?: Array<{ body: string }> };
    expect(listed.ok).toBe(true);
    expect(listed.data?.some((n) => n.body.includes("borde NE"))).toBe(true);
  });
});
