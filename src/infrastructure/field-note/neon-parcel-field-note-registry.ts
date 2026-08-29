import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type {
  AppendParcelFieldNoteInput,
  ParcelFieldNote,
  ParcelFieldNoteRegistry,
} from "@/domain/field-note/types";
import { FIELD_NOTE_LIST_MAX } from "@/domain/field-note/types";
import type { Db } from "@/infrastructure/db/client";
import { parcelFieldNotes } from "@/infrastructure/db/schema";

export class NeonParcelFieldNoteRegistry implements ParcelFieldNoteRegistry {
  constructor(private readonly db: Db) {}

  async listByParcel(input: {
    orgId: string;
    parcelId: string;
    limit?: number;
  }): Promise<ParcelFieldNote[]> {
    const limit = input.limit ?? FIELD_NOTE_LIST_MAX;
    const rows = await this.db
      .select()
      .from(parcelFieldNotes)
      .where(
        and(
          eq(parcelFieldNotes.orgId, input.orgId),
          eq(parcelFieldNotes.parcelId, input.parcelId),
        ),
      )
      .orderBy(desc(parcelFieldNotes.observedAt))
      .limit(limit);
    return rows.map((row) => this.toNote(row));
  }

  async append(input: AppendParcelFieldNoteInput): Promise<ParcelFieldNote> {
    const now = new Date();
    const observedAt = input.observedAt ?? now;
    const rows = await this.db
      .insert(parcelFieldNotes)
      .values({
        id: `pfn-${randomUUID()}`,
        orgId: input.orgId,
        parcelId: input.parcelId,
        body: input.body,
        zoneLabel: input.zoneLabel ?? null,
        observedAt,
        authorUserId: input.authorUserId,
        createdAt: now,
        photoUrl: input.photoUrl ?? null,
        photoContentType: input.photoContentType ?? null,
      })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error("Failed to append parcel field note");
    }
    return this.toNote(row);
  }

  private toNote(row: typeof parcelFieldNotes.$inferSelect): ParcelFieldNote {
    return {
      id: row.id,
      orgId: row.orgId,
      parcelId: row.parcelId,
      body: row.body,
      zoneLabel: row.zoneLabel,
      observedAt: row.observedAt.toISOString(),
      authorUserId: row.authorUserId,
      createdAt: row.createdAt.toISOString(),
      photoUrl: row.photoUrl,
      photoContentType: row.photoContentType,
    };
  }
}
