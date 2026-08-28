import { eq } from "drizzle-orm";
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
import type { Db } from "@/infrastructure/db/client";
import { dailyBriefingDeliveryPrefs } from "@/infrastructure/db/schema";

export class NeonDailyBriefingDeliveryPrefsRegistry
  implements DailyBriefingDeliveryPrefsRegistry
{
  constructor(private readonly db: Db) {}

  async getByOrgId(orgId: string): Promise<DailyBriefingDeliveryPrefs | null> {
    const rows = await this.db
      .select()
      .from(dailyBriefingDeliveryPrefs)
      .where(eq(dailyBriefingDeliveryPrefs.orgId, orgId))
      .limit(1);
    const row = rows[0];
    return row ? this.toPrefs(row) : null;
  }

  async upsert(input: UpsertDailyBriefingDeliveryPrefsInput): Promise<DailyBriefingDeliveryPrefs> {
    const channels = normalizeDeliveryChannels(input.channels);
    const parcelIds = input.parcelIds ?? [];
    const emailRecipients = normalizeEmailRecipients(input.emailRecipients ?? []);
    const sendAtLocal = normalizeSendAtLocal(input.sendAtLocal);
    const now = new Date();

    const rows = await this.db
      .insert(dailyBriefingDeliveryPrefs)
      .values({
        orgId: input.orgId,
        enabled: input.enabled,
        channels,
        sendAtLocal,
        parcelIds,
        emailRecipients,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: dailyBriefingDeliveryPrefs.orgId,
        set: {
          enabled: input.enabled,
          channels,
          sendAtLocal,
          parcelIds,
          emailRecipients,
          updatedAt: now,
        },
      })
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error("Failed to upsert daily briefing delivery prefs");
    }
    return this.toPrefs(row);
  }

  async listEnabled(): Promise<DailyBriefingDeliveryPrefs[]> {
    const rows = await this.db
      .select()
      .from(dailyBriefingDeliveryPrefs)
      .where(eq(dailyBriefingDeliveryPrefs.enabled, true));
    return rows.map((row) => this.toPrefs(row));
  }

  private toPrefs(row: typeof dailyBriefingDeliveryPrefs.$inferSelect): DailyBriefingDeliveryPrefs {
    return {
      orgId: row.orgId,
      enabled: row.enabled,
      channels: normalizeDeliveryChannels(row.channels),
      sendAtLocal: row.sendAtLocal,
      parcelIds: Array.isArray(row.parcelIds) ? row.parcelIds.filter((x): x is string => typeof x === "string") : [],
      emailRecipients: normalizeEmailRecipients(row.emailRecipients),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
