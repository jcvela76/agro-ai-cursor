/**
 * QA-4 smoke — Agro Agent tools with fixed parcelId (offline, no LLM).
 *
 * Usage:
 *   npm run smoke:agent
 */
import {
  agroAgentToolNames,
  createAgroAgentTools,
  isPlusToolAllowed,
} from "../src/agents/agro-agent/tools";
import { GetParcelRecentBriefings } from "../src/application/report/get-parcel-recent-briefings";
import {
  GetParcelAgronomicProfile,
  UpdateParcelAgronomicProfile,
} from "../src/application/parcel/parcel-agronomic-profile";
import { GetParcelVegetationIndices } from "../src/application/spectral/get-parcel-vegetation-indices";
import { GetParcelWeatherEt0 } from "../src/application/weather/get-parcel-et0";
import { GetParcelWeatherGdd } from "../src/application/weather/get-parcel-gdd";
import { GetParcelWeatherLowRainDays } from "../src/application/weather/get-parcel-low-rain-days";
import { GetParcelWeatherRainfall30d } from "../src/application/weather/get-parcel-rainfall-30d";
import { GetParcelWeatherRainfallCampaignComparison } from "../src/application/weather/get-parcel-rainfall-campaign-comparison";
import {
  GetParcelWeatherForecast,
  GetParcelWeatherObservation,
} from "../src/application/weather/get-parcel-weather";
import { defaultSyntheticSnapshots } from "../src/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "../src/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineReportRegistry } from "../src/infrastructure/report/offline-report-registry";
import { OfflineParcelAgronomicProfileRegistry } from "../src/infrastructure/parcel/offline-parcel-agronomic-profile-registry";
import { OfflineSpectralSource } from "../src/infrastructure/spectral/offline-spectral-source";
import { OfflineWeatherSource } from "../src/infrastructure/weather/offline-weather-source";

const parcelId = "parcel-lima-norte-001";
const weatherOnly = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-agronomist-001",
)!;
const weatherPlus = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-plus-005",
)!;
const crossOrg = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-cross-ws-004",
)!;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(msg);
  }
}

function buildDeps() {
  const registry = new SyntheticParcelRegistry();
  const weather = new OfflineWeatherSource();
  const spectral = new OfflineSpectralSource();
  const reports = new OfflineReportRegistry();
  const profiles = new OfflineParcelAgronomicProfileRegistry();
  return {
    observation: new GetParcelWeatherObservation(registry, weather),
    forecast: new GetParcelWeatherForecast(registry, weather),
    rainfall30d: new GetParcelWeatherRainfall30d(registry, weather),
    rainfallCampaignComparison: new GetParcelWeatherRainfallCampaignComparison(
      registry,
      weather,
      profiles,
    ),
    lowRainDays: new GetParcelWeatherLowRainDays(registry, weather),
    gdd: new GetParcelWeatherGdd(registry, weather, profiles),
    et0: new GetParcelWeatherEt0(registry, weather, profiles),
    vegetationIndices: new GetParcelVegetationIndices(registry, spectral),
    recentBriefings: new GetParcelRecentBriefings(registry, reports),
    getProfile: new GetParcelAgronomicProfile(registry, profiles),
    updateProfile: new UpdateParcelAgronomicProfile(registry, profiles),
  };
}

const toolCtx = { toolCallId: "smoke", messages: [] as never[] };

async function main() {
  console.log("QA-4 agent smoke");
  const steps: string[] = [];
  const deps = buildDeps();

  assert(!isPlusToolAllowed({ authority: null }), "gate unauth");
  steps.push("gate unauth");

  assert(!isPlusToolAllowed({ authority: weatherOnly }), "gate weather-only");
  steps.push("gate weather-only");

  assert(isPlusToolAllowed({ authority: weatherPlus }), "plus allowed");
  steps.push("plus enabled");

  const tools = createAgroAgentTools({
    authority: weatherPlus,
    parcelId,
    ...deps,
  });

  const toolRuns: Array<{ name: string; kind: string }> = [
    { name: agroAgentToolNames.observation, kind: "observation" },
    { name: agroAgentToolNames.forecast, kind: "forecast" },
    { name: agroAgentToolNames.rainfall30d, kind: "rainfall_30d" },
    { name: agroAgentToolNames.rainfallCampaignComparison, kind: "rainfall_campaign_comparison" },
    { name: agroAgentToolNames.lowRainDays, kind: "low_rain_days" },
    { name: agroAgentToolNames.gdd, kind: "gdd" },
    { name: agroAgentToolNames.et0, kind: "et0" },
    { name: agroAgentToolNames.vegetationIndices, kind: "vegetation_indices" },
  ];

  for (const { name, kind } of toolRuns) {
    const tool = tools[name as keyof typeof tools];
    const result = (await tool.execute!({}, toolCtx)) as { ok: boolean; data?: { kind: string } };
    assert(result.ok, `tool ${name} failed`);
    assert(result.data?.kind === kind, `tool ${name} kind mismatch`);
    steps.push(name);
  }

  const briefings = (await tools.getParcelRecentBriefings.execute!(
    {},
    toolCtx,
  )) as { ok: boolean; data?: { briefings: unknown[] } };
  assert(briefings.ok, "tool getParcelRecentBriefings failed");
  assert(Array.isArray(briefings.data?.briefings), "briefings list missing");
  steps.push(agroAgentToolNames.recentBriefings);

  const profileGet = (await tools.getParcelProfile.execute!(
    {},
    toolCtx,
  )) as { ok: boolean; data?: { crop: string | null } };
  assert(profileGet.ok, "tool getParcelProfile failed");
  steps.push(agroAgentToolNames.getProfile);

  const profilePut = (await tools.updateParcelProfile.execute!(
    { crop: "café demo" },
    toolCtx,
  )) as { ok: boolean; data?: { crop: string | null } };
  assert(profilePut.ok, "tool updateParcelProfile failed");
  assert(profilePut.data?.crop === "café demo", "profile crop not saved");
  steps.push(agroAgentToolNames.updateProfile);

  const crossTools = createAgroAgentTools({
    authority: crossOrg,
    parcelId,
    ...deps,
  });
  const crossObs = (await crossTools.getParcelWeatherObservation.execute!(
    {},
    toolCtx,
  )) as { ok: boolean };
  assert(!crossObs.ok, "cross-org tool should fail");
  steps.push("cross-org blocked");

  console.log(`PASS [offline] ${steps.join(" → ")}`);
}

main().catch((error) => {
  console.error("FAIL", error);
  process.exit(1);
});
