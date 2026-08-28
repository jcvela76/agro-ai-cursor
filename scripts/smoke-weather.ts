/**
 * QA-2 smoke — parcel weather observation + forecast (offline always).
 *
 * Usage:
 *   npm run smoke:weather
 *   SMOKE_SENAMHI=1 npm run smoke:weather   # also exercises senamhi_stub paid gate
 */
import {
  GetParcelWeatherForecast,
  GetParcelWeatherObservation,
} from "../src/application/weather/get-parcel-weather";
import { defaultSyntheticSnapshots } from "../src/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "../src/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineWeatherSource } from "../src/infrastructure/weather/offline-weather-source";
import {
  SENAMHI_STUB_SOURCE_ID,
  SenamhiStubWeatherSource,
} from "../src/infrastructure/weather/senamhi-stub-weather-source";

const parcelId = "parcel-lima-norte-001";
const entitled = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-org-wide-weather-006",
)!;
const noParcelAccess = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-no-parcel-002",
)!;
const noWeather = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-parcel-only-003",
)!;
const crossOrg = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-cross-ws-004",
)!;
const weatherOnly = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-agronomist-001",
)!;
const weatherPlus = defaultSyntheticSnapshots.find(
  (s) => s.userId === "user-plus-005",
)!;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(msg);
  }
}

async function runOfflineSmoke() {
  const parcels = new SyntheticParcelRegistry();
  const source = new OfflineWeatherSource();
  const observation = new GetParcelWeatherObservation(parcels, source);
  const forecast = new GetParcelWeatherForecast(parcels, source);
  const steps: string[] = [];

  const unauthObs = await observation.execute({ authority: null, parcelId });
  assert(!unauthObs.ok && unauthObs.reason === "unavailable", "offline: unauth observation");
  steps.push("gate unauth");

  const noEntObs = await observation.execute({ authority: noWeather, parcelId });
  assert(!noEntObs.ok && noEntObs.reason === "unavailable", "offline: no entitlement");
  steps.push("gate no entitlement");

  const noParcelObs = await observation.execute({ authority: noParcelAccess, parcelId });
  assert(!noParcelObs.ok && noParcelObs.reason === "unavailable", "offline: no parcel access");
  steps.push("gate parcel access");

  const crossObs = await observation.execute({ authority: crossOrg, parcelId });
  assert(!crossObs.ok && crossObs.reason === "unavailable", "offline: cross-org");
  steps.push("gate cross-org");

  const obs = await observation.execute({ authority: entitled, parcelId });
  assert(obs.ok, "offline: observation failed");
  assert(obs.data.temperatureCelsius === 22.4, "offline: observation temp");
  assert(obs.data.evidence.freshnessStatus === "fresh", "offline: observation fresh");
  assert(obs.data.evidence.timezone === "America/Lima", "offline: observation tz");
  steps.push(`obs ${obs.data.temperatureCelsius}°C`);

  const fc = await forecast.execute({ authority: entitled, parcelId });
  assert(fc.ok, "offline: forecast failed");
  assert(fc.data.days.length >= 2, "offline: forecast days");
  assert(fc.data.evidence.sourceId.includes("open-meteo"), "offline: forecast source");
  steps.push(`forecast ${fc.data.days.length}d`);

  console.log(`PASS [offline] ${steps.join(" → ")}`);
}

async function runSenamhiGateSmoke() {
  const parcels = new SyntheticParcelRegistry();
  const source = new SenamhiStubWeatherSource();
  const observation = new GetParcelWeatherObservation(parcels, source, {
    requirePaidWeatherProvider: true,
  });
  const steps: string[] = [];

  const denied = await observation.execute({ authority: weatherOnly, parcelId });
  assert(!denied.ok && denied.reason === "unavailable", "senamhi: weather-only denied");
  steps.push("gate weather-only");

  const allowed = await observation.execute({ authority: weatherPlus, parcelId });
  assert(allowed.ok, "senamhi: weather_plus failed");
  assert(
    allowed.data.evidence.sourceId === SENAMHI_STUB_SOURCE_ID,
    "senamhi: wrong source",
  );
  steps.push("obs senamhi_stub");

  console.log(`PASS [senamhi_stub] ${steps.join(" → ")}`);
}

async function main() {
  console.log("QA-2 weather smoke");
  await runOfflineSmoke();

  if (process.env.SMOKE_SENAMHI === "1") {
    await runSenamhiGateSmoke();
  } else {
    console.log("SKIP [senamhi_stub] set SMOKE_SENAMHI=1 to include paid gate");
  }
}

main().catch((error) => {
  console.error("FAIL", error);
  process.exit(1);
});
