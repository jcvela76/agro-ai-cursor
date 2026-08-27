import { createDb } from "../src/infrastructure/db/client";
import {
  traceEvents,
  traceLots,
  traceParcelLinks,
} from "../src/infrastructure/db/schema";
import type {
  TraceEventType,
  TraceLotStatus,
} from "../src/domain/traceability/types";
import seed from "../src/infrastructure/fixtures/trace-lots-coffee.json";

async function main() {
  const db = createDb(process.env.DATABASE_URL);

  for (const lot of seed.lots) {
    await db
      .insert(traceLots)
      .values({
        id: lot.id,
        orgId: lot.orgId,
        name: lot.name,
        cropType: lot.cropType,
        harvestSeason: lot.harvestSeason,
        status: lot.status as TraceLotStatus,
      })
      .onConflictDoUpdate({
        target: traceLots.id,
        set: {
          orgId: lot.orgId,
          name: lot.name,
          cropType: lot.cropType,
          harvestSeason: lot.harvestSeason,
          status: lot.status as TraceLotStatus,
        },
      });
  }

  for (const event of seed.events) {
    await db
      .insert(traceEvents)
      .values({
        id: event.id,
        lotId: event.lotId,
        eventType: event.eventType as TraceEventType,
        occurredAt: new Date(event.occurredAt),
        actorId: event.actorId,
        evidenceRef: "evidenceRef" in event ? (event.evidenceRef as string) : null,
      })
      .onConflictDoUpdate({
        target: traceEvents.id,
        set: {
          lotId: event.lotId,
          eventType: event.eventType as TraceEventType,
          occurredAt: new Date(event.occurredAt),
          actorId: event.actorId,
          evidenceRef: "evidenceRef" in event ? (event.evidenceRef as string) : null,
        },
      });
  }

  for (const link of seed.parcelLinks) {
    await db
      .insert(traceParcelLinks)
      .values({
        parcelId: link.parcelId,
        lotId: link.lotId,
        linkedAt: new Date(link.linkedAt),
      })
      .onConflictDoUpdate({
        target: [traceParcelLinks.parcelId, traceParcelLinks.lotId],
        set: {
          linkedAt: new Date(link.linkedAt),
        },
      });
  }

  console.log(
    `Seeded ${seed.lots.length} lots, ${seed.events.length} events, ${seed.parcelLinks.length} parcel links`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
