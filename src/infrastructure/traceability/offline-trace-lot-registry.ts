import type {
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
      .map((lot) => ({
        lot: { ...lot },
        events: this.events
          .filter((e) => e.lotId === lot.id)
          .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
          .map((e) => ({ ...e })),
        parcelLinks: this.parcelLinks
          .filter((p) => p.lotId === lot.id)
          .map((p) => ({ ...p })),
      }));
  }
}
