import { ListOrgParcels } from "@/application/parcel/list-org-parcels";
import {
  CreateOrgParcel,
  DeleteOrgParcel,
  UpdateOrgParcel,
} from "@/application/parcel/mutate-org-parcels";
import {
  GetWorkspaceSettings,
  UpdateWorkspaceSettings,
} from "@/application/workspace/workspace-settings";
import { GetParcelWeatherForecast, GetParcelWeatherObservation } from "@/application/weather/get-parcel-weather";
import { GetParcelWeatherEt0 } from "@/application/weather/get-parcel-et0";
import { GetParcelWeatherGdd } from "@/application/weather/get-parcel-gdd";
import { GetParcelWeatherLowRainDays } from "@/application/weather/get-parcel-low-rain-days";
import { GetParcelWeatherRainfall30d } from "@/application/weather/get-parcel-rainfall-30d";
import { GetParcelWeatherRainfallCampaignComparison } from "@/application/weather/get-parcel-rainfall-campaign-comparison";
import { AppendOrgReviewDecision } from "@/application/review/append-org-review-decision";
import { ListOrgReviewDecisions } from "@/application/review/list-org-review-decisions";
import { ListOrgTraceLots } from "@/application/traceability/list-org-trace-lots";
import {
  AppendOrgTraceEvent,
  CreateOrgTraceLot,
  UpdateOrgTraceLotEudr,
} from "@/application/traceability/mutate-org-trace-lots";
import type { AccessResolver } from "@/domain/auth/access-resolver";
import type { ParcelRegistry } from "@/domain/parcel/types";
import type { ReviewDecisionRegistry } from "@/domain/review/types";
import type { TraceLotRegistry } from "@/domain/traceability/types";
import type { OrgMetadataStore } from "@/domain/workspace/types";
import type { WeatherSource } from "@/domain/weather/types";
import { SyntheticAccessResolver } from "@/infrastructure/auth/synthetic-access-resolver";
import { ClerkMetadataAccessResolver } from "@/infrastructure/auth/clerk-metadata-access-resolver";
import {
  ClerkOrgMetadataStore,
  MemoryOrgMetadataStore,
} from "@/infrastructure/auth/clerk-org-metadata-store";
import { createDb } from "@/infrastructure/db/client";
import { NeonParcelRegistry } from "@/infrastructure/parcel/neon-parcel-registry";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineReviewDecisionRegistry } from "@/infrastructure/review/offline-review-registry";
import { NeonReviewDecisionRegistry } from "@/infrastructure/review/neon-review-registry";
import { FreeTierWeatherSource } from "@/infrastructure/weather/free-tier-weather-source";
import { NasaPowerWeatherSource } from "@/infrastructure/weather/nasa-power-weather-source";
import { OfflineWeatherSource } from "@/infrastructure/weather/offline-weather-source";
import { OpenMeteoWeatherSource } from "@/infrastructure/weather/open-meteo-weather-source";
import { NeonTraceLotRegistry } from "@/infrastructure/traceability/neon-trace-lot-registry";
import { OfflineTraceLotRegistry } from "@/infrastructure/traceability/offline-trace-lot-registry";

export function createParcelRegistry(): ParcelRegistry {
  if (process.env.DATABASE_URL) {
    return new NeonParcelRegistry(createDb());
  }
  return new SyntheticParcelRegistry();
}

export function createTraceLotRegistry(): TraceLotRegistry {
  if (process.env.DATABASE_URL) {
    return new NeonTraceLotRegistry(createDb());
  }
  return new OfflineTraceLotRegistry();
}

export function createReviewDecisionRegistry(): ReviewDecisionRegistry {
  if (process.env.DATABASE_URL) {
    return new NeonReviewDecisionRegistry(createDb());
  }
  return new OfflineReviewDecisionRegistry();
}

const parcelRegistry = createParcelRegistry();
const traceLotRegistry = createTraceLotRegistry();
const reviewDecisionRegistry = createReviewDecisionRegistry();

export const listOrgParcels = new ListOrgParcels(parcelRegistry);
export const createOrgParcel = new CreateOrgParcel(parcelRegistry);
export const updateOrgParcel = new UpdateOrgParcel(parcelRegistry);
export const deleteOrgParcel = new DeleteOrgParcel(parcelRegistry);

export function createOrgMetadataStore(): OrgMetadataStore {
  if (process.env.CLERK_SECRET_KEY) {
    return new ClerkOrgMetadataStore();
  }
  return new MemoryOrgMetadataStore({
    "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G": {
      entitlements: ["weather"],
      authorizedParcelIds: [],
    },
  });
}

const orgMetadataStore = createOrgMetadataStore();
export const getWorkspaceSettings = new GetWorkspaceSettings(orgMetadataStore);
export const updateWorkspaceSettings = new UpdateWorkspaceSettings(orgMetadataStore);

export function createWeatherSource(
  mode = process.env.WEATHER_SOURCE ?? "offline",
): WeatherSource {
  switch (mode) {
    case "open-meteo":
      return new OpenMeteoWeatherSource(parcelRegistry);
    case "nasa-power":
      return new NasaPowerWeatherSource(parcelRegistry);
    case "free":
      return new FreeTierWeatherSource(
        new NasaPowerWeatherSource(parcelRegistry),
        new OpenMeteoWeatherSource(parcelRegistry),
      );
    case "offline":
    default:
      return new OfflineWeatherSource();
  }
}

const weatherSource = createWeatherSource();

export const getParcelWeatherObservation = new GetParcelWeatherObservation(
  parcelRegistry,
  weatherSource,
);

export const getParcelWeatherForecast = new GetParcelWeatherForecast(
  parcelRegistry,
  weatherSource,
);

export const getParcelWeatherRainfall30d = new GetParcelWeatherRainfall30d(
  parcelRegistry,
  weatherSource,
);

export const getParcelWeatherRainfallCampaignComparison =
  new GetParcelWeatherRainfallCampaignComparison(parcelRegistry, weatherSource);

export const getParcelWeatherLowRainDays = new GetParcelWeatherLowRainDays(
  parcelRegistry,
  weatherSource,
);

export const getParcelWeatherGdd = new GetParcelWeatherGdd(parcelRegistry, weatherSource);

export const getParcelWeatherEt0 = new GetParcelWeatherEt0(parcelRegistry, weatherSource);

export const listOrgTraceLots = new ListOrgTraceLots(traceLotRegistry);
export const createOrgTraceLot = new CreateOrgTraceLot(
  traceLotRegistry,
  parcelRegistry,
);
export const appendOrgTraceEvent = new AppendOrgTraceEvent(traceLotRegistry);
export const updateOrgTraceLotEudr = new UpdateOrgTraceLotEudr(traceLotRegistry);

export const listOrgReviewDecisions = new ListOrgReviewDecisions(
  reviewDecisionRegistry,
);
export const appendOrgReviewDecision = new AppendOrgReviewDecision(
  reviewDecisionRegistry,
  parcelRegistry,
);

export function createAccessResolver(): AccessResolver {
  if (process.env.CLERK_SECRET_KEY) {
    return new ClerkMetadataAccessResolver();
  }
  return new SyntheticAccessResolver([]);
}
