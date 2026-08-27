import { randomUUID } from "node:crypto";
import { asc, eq, inArray } from "drizzle-orm";
import type {
  AppendTraceEventInput,
  CreateTraceLotInput,
  TraceEvent,
  TraceLot,
  TraceLotRegistry,
  TraceLotView,
  ParcelLink,
} from "@/domain/traceability/types";
import type { Db } from "@/infrastructure/db/client";
import { traceEvents, traceLots, traceParcelLinks } from "@/infrastructure/db/schema";

export class NeonTraceLotRegistry implements TraceLotRegistry {
  constructor(private readonly db: Db) {}

  async listLotsByOrg(orgId: string): Promise<TraceLotView[]> {
    const lots = await this.db
      .select()
      .from(traceLots)
      .where(eq(traceLots.orgId, orgId));
    if (lots.length === 0) {
      return [];
    }
    return this.viewsForLots(lots);
  }

  async getLotView(lotId: string): Promise<TraceLotView | undefined> {
    const rows = await this.db
      .select()
      .from(traceLots)
      .where(eq(traceLots.id, lotId))
      .limit(1);
    const lot = rows[0];
    if (!lot) {
      return undefined;
    }
    const [view] = await this.viewsForLots([lot]);
    return view;
  }

  async createLot(input: CreateTraceLotInput): Promise<TraceLotView> {
    const lotId = `lot-${randomUUID()}`;
    const rows = await this.db
      .insert(traceLots)
      .values({
        id: lotId,
        orgId: input.orgId,
        name: input.name,
        cropType: input.cropType,
        harvestSeason: input.harvestSeason,
        status: "draft",
        countryOfProduction: input.countryOfProduction,
        producerName: input.producerName,
        productionEndDate: input.productionEndDate ?? null,
        deforestationFreeDeclared: input.deforestationFreeDeclared,
      })
      .returning();

    const lot = rows[0];
    if (!lot) {
      throw new Error("Failed to insert trace lot");
    }

    if (input.parcelId) {
      await this.db.insert(traceParcelLinks).values({
        parcelId: input.parcelId,
        lotId: lot.id,
        linkedAt: new Date(),
      });
    }

    const view = await this.getLotView(lot.id);
    if (!view) {
      throw new Error("Failed to load created trace lot");
    }
    return view;
  }

  async appendEvent(input: AppendTraceEventInput): Promise<TraceLotView> {
    await this.db.insert(traceEvents).values({
      id: `evt-${randomUUID()}`,
      lotId: input.lotId,
      eventType: input.eventType,
      occurredAt: new Date(input.occurredAt),
      actorId: input.actorId,
      evidenceRef: input.evidenceRef ?? null,
    });

    if (input.eventType === "exported") {
      await this.db
        .update(traceLots)
        .set({ status: "exported" })
        .where(eq(traceLots.id, input.lotId));
    }

    const view = await this.getLotView(input.lotId);
    if (!view) {
      throw new Error(`Lot not found after append: ${input.lotId}`);
    }
    return view;
  }

  private async viewsForLots(
    lots: (typeof traceLots.$inferSelect)[],
  ): Promise<TraceLotView[]> {
    const lotIds = lots.map((l) => l.id);
    const [events, links] = await Promise.all([
      this.db
        .select()
        .from(traceEvents)
        .where(inArray(traceEvents.lotId, lotIds))
        .orderBy(asc(traceEvents.occurredAt)),
      this.db
        .select()
        .from(traceParcelLinks)
        .where(inArray(traceParcelLinks.lotId, lotIds)),
    ]);

    return lots.map((lot) => ({
      lot: this.toLot(lot),
      events: events
        .filter((e) => e.lotId === lot.id)
        .map((e) => this.toEvent(e)),
      parcelLinks: links
        .filter((p) => p.lotId === lot.id)
        .map((p) => this.toLink(p)),
    }));
  }

  private toLot(row: typeof traceLots.$inferSelect): TraceLot {
    return {
      id: row.id,
      orgId: row.orgId,
      name: row.name,
      cropType: row.cropType,
      harvestSeason: row.harvestSeason,
      status: row.status,
      countryOfProduction: row.countryOfProduction,
      producerName: row.producerName,
      deforestationFreeDeclared: row.deforestationFreeDeclared,
      ...(row.productionEndDate
        ? { productionEndDate: row.productionEndDate }
        : {}),
    };
  }

  private toEvent(row: typeof traceEvents.$inferSelect): TraceEvent {
    return {
      id: row.id,
      lotId: row.lotId,
      eventType: row.eventType,
      occurredAt: row.occurredAt.toISOString(),
      actorId: row.actorId,
      ...(row.evidenceRef ? { evidenceRef: row.evidenceRef } : {}),
    };
  }

  private toLink(row: typeof traceParcelLinks.$inferSelect): ParcelLink {
    return {
      parcelId: row.parcelId,
      lotId: row.lotId,
      linkedAt: row.linkedAt.toISOString(),
    };
  }
}
