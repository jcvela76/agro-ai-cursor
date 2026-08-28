import type {
  DailyBriefingDeliveryPrefs,
  DailyBriefingDeliveryPrefsRegistry,
} from "@/domain/report/daily-briefing-delivery";
import {
  defaultDailyBriefingDeliveryPrefs,
  normalizeDeliveryChannels,
  normalizeEmailRecipients,
  normalizeSendAtLocal,
  validateDeliveryPrefsInput,
} from "@/domain/report/daily-briefing-delivery";
import { normalizeParcelIds } from "@/domain/workspace/types";

export class GetDailyBriefingDeliveryPrefs {
  constructor(private readonly prefs: DailyBriefingDeliveryPrefsRegistry) {}

  async execute(orgId: string): Promise<DailyBriefingDeliveryPrefs> {
    const existing = await this.prefs.getByOrgId(orgId);
    return existing ?? defaultDailyBriefingDeliveryPrefs(orgId);
  }
}

export class UpdateDailyBriefingDeliveryPrefs {
  constructor(private readonly prefs: DailyBriefingDeliveryPrefsRegistry) {}

  async execute(input: {
    orgId: string;
    enabled: unknown;
    channels?: unknown;
    sendAtLocal?: unknown;
    parcelIds?: unknown;
    emailRecipients?: unknown;
  }): Promise<
    | { ok: true; prefs: DailyBriefingDeliveryPrefs }
    | { ok: false; message: string }
  > {
    const enabled = Boolean(input.enabled);
    const channels = normalizeDeliveryChannels(input.channels);
    const emailRecipients = normalizeEmailRecipients(input.emailRecipients);
    const parcelIds = normalizeParcelIds(input.parcelIds);
    const sendAtLocal = normalizeSendAtLocal(input.sendAtLocal);

    const validation = validateDeliveryPrefsInput({
      enabled,
      channels,
      emailRecipients,
    });
    if (!validation.ok) {
      return validation;
    }

    const prefs = await this.prefs.upsert({
      orgId: input.orgId,
      enabled,
      channels,
      sendAtLocal,
      parcelIds,
      emailRecipients,
    });

    return { ok: true, prefs };
  }
}
