/**
 * Report contrast smoke — fidelidad informe↔use-cases + contraste cross-provider.
 *
 * Offline siempre (synthetic lima + fixtures). Opcional Neon / weather live / CDSE:
 *
 *   npm run smoke:report-contrast
 *   SMOKE_NEON=1 npm run smoke:report-contrast
 *   SMOKE_WEATHER_LIVE=1 SMOKE_NEON=1 npm run smoke:report-contrast
 *   SMOKE_SENTINEL_LIVE=1 SMOKE_NEON=1 npm run smoke:report-contrast
 *   SMOKE_PARCEL_ID=parcel-… SMOKE_NEON=1 … npm run smoke:report-contrast
 *
 * Exit 0 si no hay fallos de fidelidad (warns cross-provider no fallan).
 * FAIL_ON_WARN=1 hace que warns también fallen el proceso.
 *
 * Pass de fidelidad ≠ acierto agronómico (ET0≠riego; NDWI≠humedad de suelo).
 */
import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { BuildReportContent } from "../src/application/report/build-report-content";
import { GetParcelWeatherEt0 } from "../src/application/weather/get-parcel-et0";
import { GetParcelWeatherGdd } from "../src/application/weather/get-parcel-gdd";
import {
  GetParcelWeatherForecast,
  GetParcelWeatherObservation,
} from "../src/application/weather/get-parcel-weather";
import { GetParcelWeatherRainfall30d } from "../src/application/weather/get-parcel-rainfall-30d";
import { GetParcelVegetationIndices } from "../src/application/spectral/get-parcel-vegetation-indices";
import { GetParcelSpectralZones } from "../src/application/spectral/get-parcel-spectral-zones";
import type { AccessSnapshot, ProductEntitlement } from "../src/domain/auth/authorize-weather-access";
import type { ParcelRegistry } from "../src/domain/parcel/types";
import type { WeatherSource } from "../src/domain/weather/types";
import type { SpectralSource } from "../src/domain/spectral/types";
import type { SpectralSceneRegistry } from "../src/domain/spectral/scene-history";
import type { SpectralZoneSnapshotRegistry } from "../src/domain/spectral/zone-history";
import { createDb } from "../src/infrastructure/db/client";
import { NeonParcelRegistry } from "../src/infrastructure/parcel/neon-parcel-registry";
import { SyntheticParcelRegistry } from "../src/infrastructure/parcel/synthetic-parcel-registry"
import { OfflineParcelAgronomicProfileRegistry } from "../src/infrastructure/parcel/offline-parcel-agronomic-profile-registry";
import { OfflineWeatherSource } from "../src/infrastructure/weather/offline-weather-source";
import { OpenMeteoWeatherSource } from "../src/infrastructure/weather/open-meteo-weather-source";
import { NasaPowerWeatherSource } from "../src/infrastructure/weather/nasa-power-weather-source";
import { FreeTierWeatherSource } from "../src/infrastructure/weather/free-tier-weather-source";
import { OfflineSpectralSource } from "../src/infrastructure/spectral/offline-spectral-source";
import { OfflineSpectralSceneRegistry } from "../src/infrastructure/spectral/offline-spectral-scene-registry";
import { NeonSpectralSceneRegistry } from "../src/infrastructure/spectral/neon-spectral-scene-registry";
import { OfflineSpectralZoneSnapshotRegistry } from "../src/infrastructure/spectral/offline-spectral-zone-snapshot-registry";
import { NeonSpectralZoneSnapshotRegistry } from "../src/infrastructure/spectral/neon-spectral-zone-snapshot-registry";
import {
  SENTINEL_HUB_SOURCE_ID,
  SentinelHubSpectralSource,
} from "../src/infrastructure/spectral/sentinel-hub-spectral-source";
import { OfflineTraceLotRegistry } from "../src/infrastructure/traceability/offline-trace-lot-registry";
import observations from "../src/infrastructure/fixtures/weather-observations.json";
import forecasts from "../src/infrastructure/fixtures/weather-forecasts.json";
import rainfall30d from "../src/infrastructure/fixtures/weather-rainfall-30d.json";
import rainfallCampaignComparison from "../src/infrastructure/fixtures/weather-rainfall-campaign-comparison.json";
import lowRainDays from "../src/infrastructure/fixtures/weather-low-rain-days.json";
import gdd from "../src/infrastructure/fixtures/weather-gdd.json";
import et0 from "../src/infrastructure/fixtures/weather-et0.json";
import type {
  WeatherEt0,
  WeatherForecast,
  WeatherGdd,
  WeatherLowRainDays,
  WeatherObservation,
  WeatherRainfall30d,
  WeatherRainfallCampaignComparison,
} from "../src/domain/weather/types";

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const ORG_PLUS = "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G";
const DEFAULT_ICA_PARCEL = "parcel-77ca04c8-8fd6-4bb4-9e53-303d8a4c4f57";
const SYNTHETIC_PARCEL = "parcel-lima-norte-001";

const weatherPlus: AccessSnapshot = {
  userId: "smoke-report-contrast",
  orgId: ORG_PLUS,
  isActiveMember: true,
  entitlements: ["weather", "weather_plus"] as ProductEntitlement[],
  authorizedParcelIds: [],
};

type RowStatus = "pass" | "fail" | "warn" | "skip";

interface ContrastRow {
  signal: string;
  reportValue: string;
  contrastValue: string;
  delta: string;
  tolerance: string;
  status: RowStatus;
  note?: string;
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(msg);
  }
}

function absDelta(a: number, b: number): number {
  return Math.abs(a - b);
}

function withinAbs(a: number, b: number, tol: number): boolean {
  return absDelta(a, b) <= tol;
}

function withinRelOrAbs(a: number, b: number, rel: number, absFloor: number): boolean {
  const delta = absDelta(a, b);
  if (delta <= absFloor) return true;
  const denom = Math.max(Math.abs(a), Math.abs(b), 1e-9);
  return delta / denom <= rel;
}

function fmtNum(n: number, digits = 2): string {
  return n.toFixed(digits);
}

async function resolveParcelId(parcels: ParcelRegistry, preferNeon: boolean): Promise<string> {
  const fromEnv = process.env.SMOKE_PARCEL_ID?.trim();
  if (fromEnv) {
    const p = await parcels.getParcel(fromEnv);
    assert(p?.geometry || p, `SMOKE_PARCEL_ID=${fromEnv} missing`);
    return fromEnv;
  }
  if (preferNeon) {
    const ica = await parcels.getParcel(DEFAULT_ICA_PARCEL);
    if (ica) {
      return DEFAULT_ICA_PARCEL;
    }
  }
  return SYNTHETIC_PARCEL;
}

function createOfflineContrastWeather(): WeatherSource {
  const obs = structuredClone(observations) as WeatherObservation[];
  const rain = structuredClone(rainfall30d) as WeatherRainfall30d[];
  const et0Fx = structuredClone(et0) as WeatherEt0[];
  if (obs[0]) obs[0].temperatureCelsius = 24.5;
  if (rain[0]) rain[0].totalPrecipitationMm = 22.0;
  if (et0Fx[0]) et0Fx[0].totalEt0Mm = 980;
  return new OfflineWeatherSource(
    obs,
    forecasts as WeatherForecast[],
    rain,
    rainfallCampaignComparison as WeatherRainfallCampaignComparison[],
    lowRainDays as WeatherLowRainDays[],
    gdd as WeatherGdd[],
    et0Fx,
  );
}

function createStack(): {
  parcels: ParcelRegistry;
  primaryWeather: WeatherSource;
  contrastWeather: WeatherSource | null;
  spectral: SpectralSource;
  scenes: SpectralSceneRegistry;
  zones: SpectralZoneSnapshotRegistry;
  labels: { weather: string; contrast: string; spectral: string; parcels: string };
} {
  const neon = process.env.SMOKE_NEON === "1";
  const weatherLive = process.env.SMOKE_WEATHER_LIVE === "1";
  const sentinelLive = process.env.SMOKE_SENTINEL_LIVE === "1";

  if (neon) {
    assert(process.env.DATABASE_URL, "SMOKE_NEON=1 requires DATABASE_URL");
  }

  const parcels: ParcelRegistry = neon
    ? new NeonParcelRegistry(createDb())
    : new SyntheticParcelRegistry();

  let primaryWeather: WeatherSource;
  let contrastWeather: WeatherSource | null;
  let weatherLabel: string;
  let contrastLabel: string;

  if (weatherLive) {
    const nasa = new NasaPowerWeatherSource(parcels);
    const openMeteo = new OpenMeteoWeatherSource(parcels);
    primaryWeather = new FreeTierWeatherSource(nasa, openMeteo);
    contrastWeather = openMeteo;
    weatherLabel = "free (nasa-power obs + open-meteo fc)";
    contrastLabel = "open-meteo (forecast proxy)";
  } else {
    primaryWeather = new OfflineWeatherSource();
    contrastWeather = createOfflineContrastWeather();
    weatherLabel = "offline-primary";
    contrastLabel = "offline-offset (synthetic 2nd source)";
  }

  let spectral: SpectralSource;
  let spectralLabel: string;
  if (sentinelLive) {
    assert(
      process.env.SENTINEL_CLIENT_ID && process.env.SENTINEL_CLIENT_SECRET,
      "SMOKE_SENTINEL_LIVE=1 requires SENTINEL_CLIENT_ID/SECRET",
    );
    spectral = new SentinelHubSpectralSource();
    spectralLabel = SENTINEL_HUB_SOURCE_ID;
  } else {
    spectral = new OfflineSpectralSource();
    spectralLabel = "offline-spectral";
  }

  const scenes: SpectralSceneRegistry = neon
    ? new NeonSpectralSceneRegistry(createDb())
    : new OfflineSpectralSceneRegistry();
  const zones: SpectralZoneSnapshotRegistry = neon
    ? new NeonSpectralZoneSnapshotRegistry(createDb())
    : new OfflineSpectralZoneSnapshotRegistry();

  return {
    parcels,
    primaryWeather,
    contrastWeather,
    spectral,
    scenes,
    zones,
    labels: {
      weather: weatherLabel,
      contrast: contrastLabel,
      spectral: spectralLabel,
      parcels: neon ? "neon" : "synthetic",
    },
  };
}

function htmlContains(html: string, needle: string): boolean {
  return html.includes(needle);
}

async function main(): Promise<void> {
  const stack = createStack();
  const parcelId = await resolveParcelId(stack.parcels, process.env.SMOKE_NEON === "1");
  const parcel = await stack.parcels.getParcel(parcelId);
  assert(parcel, `parcel ${parcelId} not found`);

  // Align authority org with parcel when using Neon Ica (may differ from Lima Coffee fixture org).
  const authority: AccessSnapshot = {
    ...weatherPlus,
    orgId: parcel.orgId,
  };

  const primaryObs = new GetParcelWeatherObservation(stack.parcels, stack.primaryWeather);
  const primaryFc = new GetParcelWeatherForecast(stack.parcels, stack.primaryWeather);
  const primaryRain = new GetParcelWeatherRainfall30d(stack.parcels, stack.primaryWeather);
  const primaryGdd = new GetParcelWeatherGdd(stack.parcels, stack.primaryWeather, new OfflineParcelAgronomicProfileRegistry());
  const primaryEt0 = new GetParcelWeatherEt0(stack.parcels, stack.primaryWeather, new OfflineParcelAgronomicProfileRegistry());
  const vegetation = new GetParcelVegetationIndices(stack.parcels, stack.spectral, stack.scenes);
  const spectralZones = new GetParcelSpectralZones(
    stack.parcels,
    stack.spectral,
    stack.zones,
  );

  const builder = new BuildReportContent(
    stack.parcels,
    new OfflineTraceLotRegistry(),
    primaryObs,
    primaryFc,
    primaryRain,
    primaryGdd,
    primaryEt0,
    vegetation,
    spectralZones,
  );

  const rows: ContrastRow[] = [];
  const authInput = { authority, parcelId };

  console.log(`Report contrast — parcel=${parcelId} org=${parcel.orgId}`);
  console.log(
    `  weather=${stack.labels.weather} contrast=${stack.labels.contrast} spectral=${stack.labels.spectral} parcels=${stack.labels.parcels}`,
  );

  const [obs, rain, et0Res, vegAuto] = await Promise.all([
    primaryObs.execute(authInput),
    primaryRain.execute(authInput),
    primaryEt0.execute(authInput),
    vegetation.execute({ ...authInput, source: "auto" }),
  ]);

  const climate = await builder.execute({
    reportType: "weather_climate",
    authority,
    parcelId,
  });
  assert(!("ok" in climate && climate.ok === false), "weather_climate build failed");
  const climateHtml = "htmlContent" in climate ? climate.htmlContent : "";

  const water = await builder.execute({
    reportType: "water_balance",
    authority,
    parcelId,
  });
  assert(!("ok" in water && water.ok === false), "water_balance build failed");
  const waterHtml = "htmlContent" in water ? water.htmlContent : "";

  // --- Fidelidad report HTML ↔ use-case ---
  if (obs.ok) {
    const needle = `${obs.data.temperatureCelsius.toFixed(1)} °C`;
    const ok = htmlContains(climateHtml, needle);
    rows.push({
      signal: "temp (fidelity)",
      reportValue: needle,
      contrastValue: "HTML weather_climate",
      delta: ok ? "0" : "missing",
      tolerance: "exact substring",
      status: ok ? "pass" : "fail",
      note: "report↔UC",
    });
  } else {
    rows.push({
      signal: "temp (fidelity)",
      reportValue: "—",
      contrastValue: obs.message,
      delta: "—",
      tolerance: "—",
      status: "skip",
      note: "observation unavailable",
    });
  }

  if (rain.ok) {
    const needle = `${rain.data.totalPrecipitationMm.toFixed(1)} mm`;
    const inClimate = htmlContains(climateHtml, needle);
    const inWater = htmlContains(waterHtml, needle);
    const ok = inClimate || inWater;
    rows.push({
      signal: "rain_30d (fidelity)",
      reportValue: needle,
      contrastValue: inClimate ? "HTML climate" : inWater ? "HTML water" : "missing",
      delta: ok ? "0" : "missing",
      tolerance: "exact substring",
      status: ok ? "pass" : "fail",
      note: "report↔UC",
    });
  } else {
    rows.push({
      signal: "rain_30d (fidelity)",
      reportValue: "—",
      contrastValue: rain.message,
      delta: "—",
      tolerance: "—",
      status: "skip",
    });
  }

  if (et0Res.ok) {
    const needleClimate = `${et0Res.data.totalEt0Mm.toFixed(1)} mm`;
    const needleWater = `${et0Res.data.totalEt0Mm.toFixed(0)} mm`;
    const ok =
      htmlContains(climateHtml, needleClimate) || htmlContains(waterHtml, needleWater);
    rows.push({
      signal: "et0 (fidelity)",
      reportValue: needleClimate,
      contrastValue: ok ? "HTML" : "missing",
      delta: ok ? "0" : "missing",
      tolerance: "exact substring",
      status: ok ? "pass" : "fail",
      note: "report↔UC",
    });
  }

  if (vegAuto.ok) {
    const ndwi = vegAuto.data.indices.find((i) => i.id === "ndwi");
    if (ndwi?.value != null) {
      const needle = ndwi.value.toFixed(2);
      const ok = htmlContains(waterHtml, needle) || htmlContains(waterHtml, "NDWI");
      rows.push({
        signal: "ndwi (fidelity)",
        reportValue: needle,
        contrastValue: ok ? "HTML water_balance" : "missing",
        delta: ok ? "0" : "missing",
        tolerance: "substring / NDWI present",
        status: ok ? "pass" : "fail",
        note: `source=${vegAuto.data.evidence.sourceLabel}; acq=${vegAuto.data.acquisitionDate}`,
      });
    }
  } else {
    rows.push({
      signal: "ndwi (fidelity)",
      reportValue: "—",
      contrastValue: vegAuto.message,
      delta: "—",
      tolerance: "—",
      status: "skip",
    });
  }

  // --- Cross-provider weather ---
  if (stack.contrastWeather) {
    const weatherLive = process.env.SMOKE_WEATHER_LIVE === "1";
    const cObs = new GetParcelWeatherObservation(stack.parcels, stack.contrastWeather);
    const cRain = new GetParcelWeatherRainfall30d(stack.parcels, stack.contrastWeather);
    const cEt0 = new GetParcelWeatherEt0(stack.parcels, stack.contrastWeather, new OfflineParcelAgronomicProfileRegistry());
    const cFc = new GetParcelWeatherForecast(stack.parcels, stack.contrastWeather);
    const [obs2, rain2, et02, fc2] = await Promise.all([
      cObs.execute(authInput),
      cRain.execute(authInput),
      cEt0.execute(authInput),
      cFc.execute(authInput),
    ]);

    if (obs.ok && obs2.ok) {
      const a = obs.data.temperatureCelsius;
      const b = obs2.data.temperatureCelsius;
      const ok = withinAbs(a, b, 1.5);
      rows.push({
        signal: "temp (cross-provider)",
        reportValue: `${fmtNum(a, 1)} °C (${stack.labels.weather})`,
        contrastValue: `${fmtNum(b, 1)} °C (${stack.labels.contrast})`,
        delta: fmtNum(absDelta(a, b), 2),
        tolerance: "±1.5 °C",
        status: ok ? "pass" : "warn",
        note: "providers ≠ ground truth único",
      });
    } else if (obs.ok && weatherLive && fc2.ok && fc2.data.days[0]) {
      const day0 = fc2.data.days[0];
      const a = obs.data.temperatureCelsius;
      const b = (day0.tempMaxCelsius + day0.tempMinCelsius) / 2;
      const ok = withinAbs(a, b, 3);
      rows.push({
        signal: "temp (cross-provider)",
        reportValue: `${fmtNum(a, 1)} °C (nasa-power obs)`,
        contrastValue: `${fmtNum(b, 1)} °C (om fc day0 mid)`,
        delta: fmtNum(absDelta(a, b), 2),
        tolerance: "±3 °C (proxy)",
        status: ok ? "pass" : "warn",
        note: "Open-Meteo sin observation; proxy forecast day0",
      });
    } else {
      rows.push({
        signal: "temp (cross-provider)",
        reportValue: obs.ok ? String(obs.data.temperatureCelsius) : obs.message,
        contrastValue: obs2.ok ? String(obs2.data.temperatureCelsius) : obs2.message,
        delta: "—",
        tolerance: "±1.5 °C",
        status: "skip",
      });
    }

    if (rain.ok && rain2.ok) {
      const a = rain.data.totalPrecipitationMm;
      const b = rain2.data.totalPrecipitationMm;
      const ok = withinRelOrAbs(a, b, 0.15, 5);
      rows.push({
        signal: "rain_30d (cross-provider)",
        reportValue: `${fmtNum(a, 1)} mm`,
        contrastValue: `${fmtNum(b, 1)} mm`,
        delta: fmtNum(absDelta(a, b), 1),
        tolerance: "±15% or ±5 mm",
        status: ok ? "pass" : "warn",
      });
    } else if (rain.ok && weatherLive) {
      rows.push({
        signal: "rain_30d (cross-provider)",
        reportValue: `${fmtNum(rain.data.totalPrecipitationMm, 1)} mm`,
        contrastValue: "open-meteo N/A",
        delta: "—",
        tolerance: "±15% or ±5 mm",
        status: "skip",
        note: "Open-Meteo no agrega rain_30d en este release",
      });
    }

    if (et0Res.ok && et02.ok) {
      const a = et0Res.data.totalEt0Mm;
      const b = et02.data.totalEt0Mm;
      const ok = withinRelOrAbs(a, b, 0.15, 1);
      rows.push({
        signal: "et0 (cross-provider)",
        reportValue: `${fmtNum(a, 1)} mm`,
        contrastValue: `${fmtNum(b, 1)} mm`,
        delta: fmtNum(absDelta(a, b), 1),
        tolerance: "±15%",
        status: ok ? "pass" : "warn",
      });
    } else if (et0Res.ok && weatherLive) {
      rows.push({
        signal: "et0 (cross-provider)",
        reportValue: `${fmtNum(et0Res.data.totalEt0Mm, 1)} mm`,
        contrastValue: "open-meteo N/A",
        delta: "—",
        tolerance: "±15%",
        status: "skip",
        note: "Open-Meteo no agrega ET0 en este release",
      });
    }
  }

  // --- Spectral cache (auto) vs live ---
  const vegLive = await vegetation.execute({ ...authInput, source: "live" });
  if (vegAuto.ok && vegLive.ok) {
    const a = vegAuto.data.indices.find((i) => i.id === "ndwi")?.value;
    const b = vegLive.data.indices.find((i) => i.id === "ndwi")?.value;
    if (typeof a === "number" && typeof b === "number") {
      const sameScene =
        vegAuto.data.evidence.sourceId === vegLive.data.evidence.sourceId &&
        vegAuto.data.acquisitionDate === vegLive.data.acquisitionDate;
      const ok = withinAbs(a, b, 0.05);
      rows.push({
        signal: "ndwi (auto vs live)",
        reportValue: `${fmtNum(a, 3)} auto`,
        contrastValue: `${fmtNum(b, 3)} live`,
        delta: fmtNum(absDelta(a, b), 3),
        tolerance: "±0.05 same scene",
        status: sameScene ? (ok ? "pass" : "fail") : ok ? "pass" : "warn",
        note: sameScene
          ? "same acquisition/sourceId"
          : `acq auto=${vegAuto.data.acquisitionDate} live=${vegLive.data.acquisitionDate}`,
      });
    }
  } else if (!vegLive.ok) {
    rows.push({
      signal: "ndwi (auto vs live)",
      reportValue: vegAuto.ok ? "auto ok" : vegAuto.message,
      contrastValue: vegLive.message,
      delta: "—",
      tolerance: "±0.05",
      status: "skip",
    });
  }

  // Print scorecard
  const pad = (s: string, n: number) => (s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length));
  console.log("\nSignal                    Report                 Contrast               Δ       Tol              Status");
  console.log("-".repeat(110));
  for (const r of rows) {
    console.log(
      `${pad(r.signal, 25)} ${pad(r.reportValue, 22)} ${pad(r.contrastValue, 22)} ${pad(r.delta, 7)} ${pad(r.tolerance, 16)} ${r.status.toUpperCase()}${r.note ? `  (${r.note})` : ""}`,
    );
  }

  const fails = rows.filter((r) => r.status === "fail");
  const warns = rows.filter((r) => r.status === "warn");
  const passes = rows.filter((r) => r.status === "pass");
  const skips = rows.filter((r) => r.status === "skip");

  console.log(
    `\nSummary: pass=${passes.length} warn=${warns.length} fail=${fails.length} skip=${skips.length}`,
  );
  console.log(
    "NOTE: fidelity pass ≠ agronomic accuracy. ET0≠irrigation; NDWI≠soil moisture.",
  );

  const failOnWarn = process.env.FAIL_ON_WARN === "1";
  if (fails.length > 0 || (failOnWarn && warns.length > 0)) {
    throw new Error(
      `contrast failed: ${fails.length} fail(s)${failOnWarn ? `, ${warns.length} warn(s)` : ""}`,
    );
  }

  console.log("\nPASS smoke:report-contrast");
}

main().catch((error) => {
  console.error("FAIL", error);
  process.exit(1);
});
