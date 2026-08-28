import type {
  DailyBriefingDeliveryPrefs,
  DailyBriefingDeliveryPrefsRegistry,
  UpsertDailyBriefingDeliveryPrefsInput,
} from "@/domain/report/daily-briefing-delivery";
import {
  normalizeDeliveryChannels,
  normalizeEmailRecipients,
  normalizeSendAtLocal,
} from "@/domain/report/daily-briefing-delivery";

export class OfflineDailyBriefingDeliveryPrefsRegistry
  implements DailyBriefingDeliveryPrefsRegistry
{
  private readonly byOrg = new Map<string, DailyBriefingDeliveryPrefs>();

  async getByOrgId(orgId: string): Promise<DailyBriefingDeliveryPrefs | null> {
    return this.byOrg.get(orgId) ?? null;
  }

  async upsert(input: UpsertDailyBriefingDeliveryPrefsInput): Promise<DailyBriefingDeliveryPrefs> {
    const prefs: DailyBriefingDeliveryPrefs = {
      orgId: input.orgId,
      enabled: input.enabled,
      channels: normalizeDeliveryChannels(input.channels),
      sendAtLocal: normalizeSendAtLocal(input.sendAtLocal),
      parcelIds: [...(input.parcelIds ?? [])],
      emailRecipients: normalizeEmailRecipients(input.emailRecipients ?? []),
      updatedAt: new Date().toISOString(),
    };
    this.byOrg.set(input.orgId, prefs);
    return prefs;
  }

  async listEnabled(): Promise<DailyBriefingDeliveryPrefs[]> {
    return [...this.byOrg.values()].filter((p) => p.enabled);
  }
}
