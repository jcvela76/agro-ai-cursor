import { randomUUID } from "node:crypto";
import type {
  AppendParcelFieldNoteInput,
  ParcelFieldNote,
  ParcelFieldNoteRegistry,
} from "@/domain/field-note/types";
import { FIELD_NOTE_LIST_MAX } from "@/domain/field-note/types";

export class OfflineParcelFieldNoteRegistry implements ParcelFieldNoteRegistry {
  private readonly notes = new Map<string, ParcelFieldNote>();

  async listByParcel(input: {
    orgId: string;
    parcelId: string;
    limit?: number;
  }): Promise<ParcelFieldNote[]> {
    const limit = input.limit ?? FIELD_NOTE_LIST_MAX;
    return [...this.notes.values()]
      .filter((n) => n.orgId === input.orgId && n.parcelId === input.parcelId)
      .sort(
        (a, b) =>
          new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime(),
      )
      .slice(0, limit)
      .map((n) => ({ ...n }));
  }

  async append(input: AppendParcelFieldNoteInput): Promise<ParcelFieldNote> {
    const now = new Date();
    const note: ParcelFieldNote = {
      id: `pfn-${randomUUID()}`,
      orgId: input.orgId,
      parcelId: input.parcelId,
      body: input.body,
      zoneLabel: input.zoneLabel ?? null,
      observedAt: (input.observedAt ?? now).toISOString(),
      authorUserId: input.authorUserId,
      createdAt: now.toISOString(),
      photoUrl: input.photoUrl ?? null,
      photoContentType: input.photoContentType ?? null,
    };
    this.notes.set(note.id, note);
    return { ...note };
  }

  clear(): void {
    this.notes.clear();
  }
}
