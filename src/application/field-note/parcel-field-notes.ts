import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";
import {
  authorizeWeatherAccess,
  authorizeWeatherPlusAccess,
} from "@/domain/auth/authorize-weather-access";
import type {
  ParcelFieldNote,
  ParcelFieldNoteRegistry,
} from "@/domain/field-note/types";
import {
  FIELD_NOTE_LIST_MAX,
  normalizeFieldNoteBody,
  normalizeFieldNoteZoneLabel,
  parseObservedAt,
} from "@/domain/field-note/types";
import type { ParcelRegistry } from "@/domain/parcel/types";

export type FieldNoteResult =
  | { ok: true; data: ParcelFieldNote | ParcelFieldNote[] }
  | { ok: false; reason: "unavailable"; message: string };

async function authorizeFieldNotes(
  parcels: ParcelRegistry,
  authority: AccessSnapshot | null | undefined,
  parcelId: string,
): Promise<
  | { ok: true; authority: AccessSnapshot; orgId: string }
  | { ok: false; reason: "unavailable"; message: string }
> {
  if (!authorizeWeatherPlusAccess(authority) || !authority) {
    return {
      ok: false,
      reason: "unavailable",
      message: "Weather Intelligence Plus is required for field notes.",
    };
  }

  const parcel = await parcels.getParcel(parcelId);
  if (!parcel) {
    return {
      ok: false,
      reason: "unavailable",
      message: "Field notes are not available for this request.",
    };
  }

  const access = authorizeWeatherAccess(authority, parcelId, parcel.orgId);
  if (!access.ok) {
    return {
      ok: false,
      reason: "unavailable",
      message: "Field notes are not available for this request.",
    };
  }

  return { ok: true, authority, orgId: parcel.orgId };
}

export class ListParcelFieldNotes {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly notes: ParcelFieldNoteRegistry,
  ) {}

  async execute(input: {
    authority: AccessSnapshot | null | undefined;
    parcelId: string;
    limit?: number;
  }): Promise<
    | { ok: true; data: ParcelFieldNote[] }
    | { ok: false; reason: "unavailable"; message: string }
  > {
    const gate = await authorizeFieldNotes(
      this.parcels,
      input.authority,
      input.parcelId,
    );
    if (!gate.ok) {
      return gate;
    }

    const data = await this.notes.listByParcel({
      orgId: gate.orgId,
      parcelId: input.parcelId,
      limit: input.limit ?? FIELD_NOTE_LIST_MAX,
    });
    return { ok: true, data };
  }
}

export class AppendParcelFieldNote {
  constructor(
    private readonly parcels: ParcelRegistry,
    private readonly notes: ParcelFieldNoteRegistry,
  ) {}

  async execute(input: {
    authority: AccessSnapshot | null | undefined;
    parcelId: string;
    body: unknown;
    zoneLabel?: unknown;
    observedAt?: unknown;
    photoUrl?: string | null;
    photoContentType?: string | null;
  }): Promise<
    | { ok: true; data: ParcelFieldNote }
    | { ok: false; reason: "unavailable"; message: string }
  > {
    const gate = await authorizeFieldNotes(
      this.parcels,
      input.authority,
      input.parcelId,
    );
    if (!gate.ok) {
      return gate;
    }

    const body = normalizeFieldNoteBody(input.body);
    if (!body) {
      return {
        ok: false,
        reason: "unavailable",
        message: "El cuerpo de la nota es obligatorio.",
      };
    }

    const zoneLabel = normalizeFieldNoteZoneLabel(input.zoneLabel);
    if (zoneLabel === undefined && input.zoneLabel !== undefined) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Etiqueta de zona inválida.",
      };
    }

    const observedAt = parseObservedAt(input.observedAt);
    if (input.observedAt !== undefined && input.observedAt !== null && !observedAt) {
      return {
        ok: false,
        reason: "unavailable",
        message: "Fecha de observación inválida.",
      };
    }

    const data = await this.notes.append({
      orgId: gate.orgId,
      parcelId: input.parcelId,
      body,
      zoneLabel: zoneLabel ?? null,
      observedAt,
      authorUserId: gate.authority.userId,
      photoUrl: input.photoUrl ?? null,
      photoContentType: input.photoContentType ?? null,
    });
    return { ok: true, data };
  }
}
