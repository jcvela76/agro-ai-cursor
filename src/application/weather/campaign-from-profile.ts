import type { ParcelAgronomicProfileRegistry } from "@/domain/parcel/agronomic-profile";
import {
  emptyParcelAgronomicProfile,
  resolveCampaignWindow,
  resolveGddBaseCelsius,
} from "@/domain/parcel/agronomic-profile";
import { kcForCrop } from "@/domain/parcel/crop-catalog";
import type { WeatherCampaignQuery, WeatherEt0 } from "@/domain/weather/types";

export async function campaignQueryForParcel(input: {
  profiles: ParcelAgronomicProfileRegistry;
  orgId: string;
  parcelId: string;
  includeGddBase?: boolean;
}): Promise<WeatherCampaignQuery> {
  const profile =
    (await input.profiles.getByParcelId(input.orgId, input.parcelId)) ??
    emptyParcelAgronomicProfile(input.orgId, input.parcelId);
  const window = resolveCampaignWindow(profile);
  return {
    startDate: window.startDate,
    endDate: window.endDate,
    source: window.source,
    ...(input.includeGddBase
      ? { baseTempCelsius: resolveGddBaseCelsius(profile) }
      : {}),
  };
}

export async function enrichEt0WithEtc(input: {
  profiles: ParcelAgronomicProfileRegistry;
  orgId: string;
  parcelId: string;
  et0: WeatherEt0;
}): Promise<WeatherEt0> {
  const profile =
    (await input.profiles.getByParcelId(input.orgId, input.parcelId)) ??
    emptyParcelAgronomicProfile(input.orgId, input.parcelId);
  const kcInfo = kcForCrop(profile.cropKey, profile.phenologyStage);
  if (!kcInfo) {
    return {
      ...input.et0,
      etcEstimateMm: null,
      kcUsed: null,
      kcStage: null,
    };
  }
  const etc = Math.round(input.et0.totalEt0Mm * kcInfo.kc * 100) / 100;
  return {
    ...input.et0,
    etcEstimateMm: etc,
    kcUsed: kcInfo.kc,
    kcStage: kcInfo.stage,
  };
}
