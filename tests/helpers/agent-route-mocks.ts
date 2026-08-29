import {
  AppendParcelAgentChat,
  AuthorizeParcelAgentChat,
  LoadParcelAgentChat,
} from "@/application/agent/parcel-agent-chat";
import {
  GetParcelAgronomicProfile,
  UpdateParcelAgronomicProfile,
} from "@/application/parcel/parcel-agronomic-profile";
import { GetParcelRecentBriefings } from "@/application/report/get-parcel-recent-briefings";
import { GetParcelSpectralHistory } from "@/application/spectral/get-parcel-spectral-history";
import { GetParcelSpectralZones } from "@/application/spectral/get-parcel-spectral-zones";
import { GetParcelVegetationIndices } from "@/application/spectral/get-parcel-vegetation-indices";
import { GetParcelWeatherEt0 } from "@/application/weather/get-parcel-et0";
import { GetParcelWeatherGdd } from "@/application/weather/get-parcel-gdd";
import { GetParcelWeatherLowRainDays } from "@/application/weather/get-parcel-low-rain-days";
import { GetParcelWeatherRainfall30d } from "@/application/weather/get-parcel-rainfall-30d";
import { GetParcelWeatherRainfallCampaignComparison } from "@/application/weather/get-parcel-rainfall-campaign-comparison";
import {
  GetParcelWeatherForecast,
  GetParcelWeatherObservation,
} from "@/application/weather/get-parcel-weather";
import {
  defaultSyntheticSnapshots,
  SyntheticAccessResolver,
} from "@/infrastructure/auth/synthetic-access-resolver";
import { OfflineAgentChatRegistry } from "@/infrastructure/agent/offline-agent-chat-registry";
import { MemoryOrgMetadataStore } from "@/infrastructure/auth/clerk-org-metadata-store";
import { OfflineParcelAgronomicProfileRegistry } from "@/infrastructure/parcel/offline-parcel-agronomic-profile-registry";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineReportRegistry } from "@/infrastructure/report/offline-report-registry";
import { OfflineSpectralSceneRegistry } from "@/infrastructure/spectral/offline-spectral-scene-registry";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";
import { OfflineSpectralZoneSnapshotRegistry } from "@/infrastructure/spectral/offline-spectral-zone-snapshot-registry";
import { OfflineWeatherSource } from "@/infrastructure/weather/offline-weather-source";

const parcels = new SyntheticParcelRegistry();
const weather = new OfflineWeatherSource();
const spectral = new OfflineSpectralSource();
const profiles = new OfflineParcelAgronomicProfileRegistry();
const reports = new OfflineReportRegistry();
const scenes = new OfflineSpectralSceneRegistry();
const zoneSnapshots = new OfflineSpectralZoneSnapshotRegistry();
const chats = new OfflineAgentChatRegistry();
const metadata = new MemoryOrgMetadataStore({
  "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G": {
    entitlements: ["weather", "weather_plus"],
    authorizedParcelIds: [],
    billingPlanSlug: "weather_plus",
  },
});

export const agentRouteContainerMock = {
  createAccessResolver: () => new SyntheticAccessResolver(defaultSyntheticSnapshots),
  getParcelWeatherObservation: new GetParcelWeatherObservation(parcels, weather),
  getParcelWeatherForecast: new GetParcelWeatherForecast(parcels, weather),
  getParcelWeatherRainfall30d: new GetParcelWeatherRainfall30d(parcels, weather),
  getParcelWeatherRainfallCampaignComparison: new GetParcelWeatherRainfallCampaignComparison(
    parcels,
    weather,
  ),
  getParcelWeatherLowRainDays: new GetParcelWeatherLowRainDays(parcels, weather),
  getParcelWeatherGdd: new GetParcelWeatherGdd(parcels, weather),
  getParcelWeatherEt0: new GetParcelWeatherEt0(parcels, weather),
  getParcelVegetationIndices: new GetParcelVegetationIndices(parcels, spectral),
  getParcelSpectralZones: new GetParcelSpectralZones(parcels, spectral, zoneSnapshots),
  getParcelSpectralHistory: new GetParcelSpectralHistory(parcels, scenes),
  getParcelRecentBriefings: new GetParcelRecentBriefings(parcels, reports),
  getParcelAgronomicProfile: new GetParcelAgronomicProfile(parcels, profiles),
  updateParcelAgronomicProfile: new UpdateParcelAgronomicProfile(parcels, profiles),
  loadParcelAgentChat: new LoadParcelAgentChat(parcels, chats, metadata),
  appendParcelAgentChat: new AppendParcelAgentChat(parcels, chats, metadata),
  authorizeParcelAgentChat: new AuthorizeParcelAgentChat(parcels),
};

export { defaultSyntheticSnapshots };
