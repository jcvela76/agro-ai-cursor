import { ListOrgParcels } from "@/application/parcel/list-org-parcels";
import {
  CreateOrgParcel,
  DeleteOrgParcel,
  UpdateOrgParcel,
} from "@/application/parcel/mutate-org-parcels";
import { SyncOrgBillingEntitlements } from "@/application/billing/sync-org-billing-entitlements";
import { SyncOrgMemberLimit } from "@/application/billing/sync-org-member-limit";
import { EnforceOrgMemberLimitOnInvite } from "@/application/billing/enforce-org-member-limit-on-invite";
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
import { GetParcelVegetationIndices } from "@/application/spectral/get-parcel-vegetation-indices";
import { GetParcelSpectralOverlay } from "@/application/spectral/get-parcel-spectral-overlay";
import { AppendOrgReviewDecision } from "@/application/review/append-org-review-decision";
import { ListOrgReviewDecisions } from "@/application/review/list-org-review-decisions";
import { BuildReportContent } from "@/application/report/build-report-content";
import { BuildDailyBriefing } from "@/application/report/build-daily-briefing";
import { CollectParcelSignals } from "@/application/report/collect-parcel-signals";
import { GetParcelRecentBriefings } from "@/application/report/get-parcel-recent-briefings";
import {
  GenerateOrgReport,
  GetOrgReport,
  GetReportQuota,
} from "@/application/report/report-use-cases";
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
import type { SpectralSource } from "@/domain/spectral/types";
import type { WeatherSource } from "@/domain/weather/types";
import { SyntheticAccessResolver } from "@/infrastructure/auth/synthetic-access-resolver";
import { ClerkMetadataAccessResolver } from "@/infrastructure/auth/clerk-metadata-access-resolver";
import {
  ClerkOrgMetadataStore,
  MemoryOrgMetadataStore,
} from "@/infrastructure/auth/clerk-org-metadata-store";
import {
  ClerkOrgMemberLimitGateway,
  MemoryOrgMemberLimitGateway,
} from "@/infrastructure/auth/clerk-org-member-limit-gateway";
import { createDb } from "@/infrastructure/db/client";
import {
  GetParcelAgronomicProfile,
  UpdateParcelAgronomicProfile,
} from "@/application/parcel/parcel-agronomic-profile";
import { NeonParcelAgronomicProfileRegistry } from "@/infrastructure/parcel/neon-parcel-agronomic-profile-registry";
import { OfflineParcelAgronomicProfileRegistry } from "@/infrastructure/parcel/offline-parcel-agronomic-profile-registry";
import { NeonParcelRegistry } from "@/infrastructure/parcel/neon-parcel-registry";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineReviewDecisionRegistry } from "@/infrastructure/review/offline-review-registry";
import { NeonReviewDecisionRegistry } from "@/infrastructure/review/neon-review-registry";
import { FreeTierWeatherSource } from "@/infrastructure/weather/free-tier-weather-source";
import { NasaPowerWeatherSource } from "@/infrastructure/weather/nasa-power-weather-source";
import { OfflineWeatherSource } from "@/infrastructure/weather/offline-weather-source";
import { OpenMeteoWeatherSource } from "@/infrastructure/weather/open-meteo-weather-source";
import { SenamhiStubWeatherSource } from "@/infrastructure/weather/senamhi-stub-weather-source";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";
import { SentinelHubStubSpectralSource } from "@/infrastructure/spectral/sentinel-hub-stub-spectral-source";
import { SentinelHubSpectralSource } from "@/infrastructure/spectral/sentinel-hub-spectral-source";
import { NeonTraceLotRegistry } from "@/infrastructure/traceability/neon-trace-lot-registry";
import { OfflineTraceLotRegistry } from "@/infrastructure/traceability/offline-trace-lot-registry";
import { NeonReportRegistry } from "@/infrastructure/report/neon-report-registry";
import { OfflineReportRegistry } from "@/infrastructure/report/offline-report-registry";
import { createPdfRenderer } from "@/infrastructure/report/create-pdf-renderer";
import {
  GetDailyBriefingDeliveryPrefs,
  UpdateDailyBriefingDeliveryPrefs,
} from "@/application/report/daily-briefing-delivery-prefs";
import { RunDailyBriefingDelivery } from "@/application/report/run-daily-briefing-delivery";
import { NeonDailyBriefingDeliveryPrefsRegistry } from "@/infrastructure/report/neon-daily-briefing-delivery-prefs";
import { OfflineDailyBriefingDeliveryPrefsRegistry } from "@/infrastructure/report/offline-daily-briefing-delivery-prefs";
import { createEmailSender } from "@/infrastructure/email/email-sender";
import {
  isPaidWeatherSourceMode,
} from "@/application/weather/weather-use-case-options";

export function createParcelRegistry(): ParcelRegistry {
  if (process.env.DATABASE_URL) {
    return new NeonParcelRegistry(createDb());
  }
  return new SyntheticParcelRegistry();
}

export function createParcelAgronomicProfileRegistry() {
  if (process.env.DATABASE_URL) {
    return new NeonParcelAgronomicProfileRegistry(createDb());
  }
  return new OfflineParcelAgronomicProfileRegistry();
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

export function createReportRegistry() {
  if (process.env.DATABASE_URL) {
    return new NeonReportRegistry(createDb());
  }
  return new OfflineReportRegistry();
}

export function createDailyBriefingDeliveryPrefsRegistry() {
  if (process.env.DATABASE_URL) {
    return new NeonDailyBriefingDeliveryPrefsRegistry(createDb());
  }
  return new OfflineDailyBriefingDeliveryPrefsRegistry();
}

const parcelRegistry = createParcelRegistry();
const parcelAgronomicProfileRegistry = createParcelAgronomicProfileRegistry();
const traceLotRegistry = createTraceLotRegistry();
const reviewDecisionRegistry = createReviewDecisionRegistry();
const reportRegistry = createReportRegistry();
const dailyBriefingDeliveryPrefsRegistry = createDailyBriefingDeliveryPrefsRegistry();
const emailSender = createEmailSender();

export const listOrgParcels = new ListOrgParcels(parcelRegistry);
export const createOrgParcel = new CreateOrgParcel(parcelRegistry);
export const updateOrgParcel = new UpdateOrgParcel(parcelRegistry);
export const deleteOrgParcel = new DeleteOrgParcel(parcelRegistry);

export const getParcelAgronomicProfile = new GetParcelAgronomicProfile(
  parcelRegistry,
  parcelAgronomicProfileRegistry,
);
export const updateParcelAgronomicProfile = new UpdateParcelAgronomicProfile(
  parcelRegistry,
  parcelAgronomicProfileRegistry,
);

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

function createOrgMemberLimitGateway() {
  if (process.env.CLERK_SECRET_KEY) {
    return new ClerkOrgMemberLimitGateway();
  }
  return new MemoryOrgMemberLimitGateway();
}

const orgMemberLimitGateway = createOrgMemberLimitGateway();

export const getWorkspaceSettings = new GetWorkspaceSettings(orgMetadataStore);
export const updateWorkspaceSettings = new UpdateWorkspaceSettings(orgMetadataStore);
export const syncOrgBillingEntitlements = new SyncOrgBillingEntitlements(orgMetadataStore);
export const syncOrgMemberLimit = new SyncOrgMemberLimit(orgMetadataStore, orgMemberLimitGateway);
export const enforceOrgMemberLimitOnInvite = new EnforceOrgMemberLimitOnInvite(
  orgMetadataStore,
  orgMemberLimitGateway,
);

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
    case "senamhi_stub":
      return new SenamhiStubWeatherSource();
    case "senamhi":
      throw new Error(
        "WEATHER_SOURCE=senamhi (live) is disabled until contract/legal; use senamhi_stub.",
      );
    case "offline":
    default:
      return new OfflineWeatherSource();
  }
}

const weatherSourceMode = process.env.WEATHER_SOURCE ?? "offline";
const weatherSource = createWeatherSource(weatherSourceMode);
const weatherUseCaseOptions = {
  requirePaidWeatherProvider: isPaidWeatherSourceMode(weatherSourceMode),
};

export const getParcelWeatherObservation = new GetParcelWeatherObservation(
  parcelRegistry,
  weatherSource,
  weatherUseCaseOptions,
);

export const getParcelWeatherForecast = new GetParcelWeatherForecast(
  parcelRegistry,
  weatherSource,
  weatherUseCaseOptions,
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

export function createSpectralSource(
  mode = process.env.SPECTRAL_SOURCE ?? "offline",
): SpectralSource {
  switch (mode) {
    case "sentinel_hub_stub":
      return new SentinelHubStubSpectralSource();
    case "sentinel_hub": {
      const clientId = process.env.SENTINEL_CLIENT_ID;
      const clientSecret = process.env.SENTINEL_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        // Avoid crashing Next build/import when Preview env is incomplete; fall back offline.
        console.warn(
          "SPECTRAL_SOURCE=sentinel_hub missing SENTINEL_CLIENT_*; using offline spectral source.",
        );
        return new OfflineSpectralSource();
      }
      return new SentinelHubSpectralSource({ clientId, clientSecret });
    }
    case "offline":
    default:
      return new OfflineSpectralSource();
  }
}

const spectralSource = createSpectralSource(process.env.SPECTRAL_SOURCE ?? "offline");

export const getParcelVegetationIndices = new GetParcelVegetationIndices(
  parcelRegistry,
  spectralSource,
);

export const getParcelSpectralOverlay = new GetParcelSpectralOverlay(
  parcelRegistry,
  spectralSource,
);

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

export const buildReportContent = new BuildReportContent(
  parcelRegistry,
  traceLotRegistry,
  getParcelWeatherObservation,
  getParcelWeatherForecast,
  getParcelWeatherRainfall30d,
  getParcelWeatherGdd,
  getParcelWeatherEt0,
  getParcelVegetationIndices,
);

export const collectParcelSignals = new CollectParcelSignals(
  parcelRegistry,
  getParcelWeatherObservation,
  getParcelWeatherForecast,
  getParcelWeatherRainfall30d,
  getParcelWeatherEt0,
  getParcelVegetationIndices,
);

export const buildDailyBriefing = new BuildDailyBriefing(
  reportRegistry,
  collectParcelSignals,
);

export const getReportQuota = new GetReportQuota(reportRegistry, orgMetadataStore);
export const generateOrgReport = new GenerateOrgReport(
  reportRegistry,
  buildReportContent,
  buildDailyBriefing,
  createPdfRenderer(),
  orgMetadataStore,
);
export const getOrgReport = new GetOrgReport(reportRegistry);

export const getParcelRecentBriefings = new GetParcelRecentBriefings(
  parcelRegistry,
  reportRegistry,
);

export const getDailyBriefingDeliveryPrefs = new GetDailyBriefingDeliveryPrefs(
  dailyBriefingDeliveryPrefsRegistry,
);
export const updateDailyBriefingDeliveryPrefs = new UpdateDailyBriefingDeliveryPrefs(
  dailyBriefingDeliveryPrefsRegistry,
);
export const runDailyBriefingDelivery = new RunDailyBriefingDelivery(
  dailyBriefingDeliveryPrefsRegistry,
  parcelRegistry,
  reportRegistry,
  orgMetadataStore,
  generateOrgReport,
  emailSender,
);

export function createAccessResolver(): AccessResolver {
  if (process.env.CLERK_SECRET_KEY) {
    return new ClerkMetadataAccessResolver();
  }
  return new SyntheticAccessResolver([]);
}
