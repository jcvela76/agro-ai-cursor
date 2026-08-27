import { randomUUID } from "node:crypto";
import type {
  AppendTraceEventInput,
  CreateTraceLotInput,
  TraceEvent,
  TraceLot,
  TraceLotRegistry,
  TraceLotView,
  ParcelLink,
} from "@/domain/traceability/types";
import fixture from "@/infrastructure/fixtures/trace-lots-coffee.json";

interface TraceFixtureFile {
  lots: TraceLot[];
  events: TraceEvent[];
  parcelLinks: ParcelLink[];
}

export class OfflineTraceLotRegistry implements TraceLotRegistry {
  private readonly lots: TraceLot[];
  private readonly events: TraceEvent[];
  private readonly parcelLinks: ParcelLink[];

  constructor(data: TraceFixtureFile = fixture as TraceFixtureFile) {
    this.lots = data.lots.map((l) => ({ ...l }));
    this.events = data.events.map((e) => ({ ...e }));
    this.parcelLinks = data.parcelLinks.map((p) => ({ ...p }));
  }

  async listLotsByOrg(orgId: string): Promise<TraceLotView[]> {
    return this.lots
      .filter((lot) => lot.orgId === orgId)
      .map((lot) => this.toView(lot));
  }

  async getLotView(lotId: string): Promise<TraceLotView | undefined> {
    const lot = this.lots.find((l) => l.id === lotId);
    return lot ? this.toView(lot) : undefined;
  }

  async createLot(input: CreateTraceLotInput): Promise<TraceLotView> {
    const lot: TraceLot = {
      id: `lot-${randomUUID()}`,
      orgId: input.orgId,
      name: input.name,
      cropType: input.cropType,
      harvestSeason: input.harvestSeason,
      status: "draft",
    };
    this.lots.push(lot);

    if (input.parcelId) {
      this.parcelLinks.push({
        parcelId: input.parcelId,
        lotId: lot.id,
        linkedAt: new Date().toISOString(),
      });
    }

    return this.toView(lot);
  }

  async appendEvent(input: AppendTraceEventInput): Promise<TraceLotView> {
    const lot = this.lots.find((l) => l.id === input.lotId);
    if (!lot) {
      throw new Error(`Lot not found: ${input.lotId}`);
    }

    const event: TraceEvent = {
      id: `evt-${randomUUID()}`,
      lotId: input.lotId,
      eventType: input.eventType,
      occurredAt: input.occurredAt,
      actorId: input.actorId,
      ...(input.evidenceRef ? { evidenceRef: input.evidenceRef } : {}),
    };
    this.events.push(event);

    if (input.eventType === "exported" && lot.status !== "exported") {
      lot.status = "exported";
    }

    return this.toView(lot);
  }

  private toView(lot: TraceLot): TraceLotView {
    return {
      lot: { ...lot },
      events: this.events
        .filter((e) => e.lotId === lot.id)
        .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
        .map((e) => ({ ...e })),
      parcelLinks: this.parcelLinks
        .filter((p) => p.lotId === lot.id)
        .map((p) => ({ ...p })),
    };
  }
}
