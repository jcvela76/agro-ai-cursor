export type DailyBriefingDeliveryChannel = "email" | "whatsapp";

export interface DailyBriefingDeliveryPrefs {
  orgId: string;
  enabled: boolean;
  /** Channels to deliver. WhatsApp is reserved (Report-2b+). */
  channels: DailyBriefingDeliveryChannel[];
  /** Local time HH:MM in America/Lima (display / future hourly cron). */
  sendAtLocal: string;
  /** Empty = all org parcels (respecting Plus + parcel allowlist). */
  parcelIds: string[];
  /** Destinatarios email (admin). Required when email channel is on. */
  emailRecipients: string[];
  updatedAt: string;
}

export interface UpsertDailyBriefingDeliveryPrefsInput {
  orgId: string;
  enabled: boolean;
  channels: DailyBriefingDeliveryChannel[];
  sendAtLocal?: string;
  parcelIds?: string[];
  emailRecipients?: string[];
}

export interface DailyBriefingDeliveryPrefsRegistry {
  getByOrgId(orgId: string): Promise<DailyBriefingDeliveryPrefs | null>;
  upsert(input: UpsertDailyBriefingDeliveryPrefsInput): Promise<DailyBriefingDeliveryPrefs>;
  listEnabled(): Promise<DailyBriefingDeliveryPrefs[]>;
}

export function defaultDailyBriefingDeliveryPrefs(orgId: string): DailyBriefingDeliveryPrefs {
  return {
    orgId,
    enabled: false,
    channels: ["email"],
    sendAtLocal: "06:00",
    parcelIds: [],
    emailRecipients: [],
    updatedAt: new Date().toISOString(),
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmailRecipients(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const email = item.trim().toLowerCase();
    if (EMAIL_RE.test(email) && email.length <= 320) {
      out.push(email);
    }
  }
  return [...new Set(out)];
}

export function normalizeDeliveryChannels(raw: unknown): DailyBriefingDeliveryChannel[] {
  if (!Array.isArray(raw)) {
    return ["email"];
  }
  const set = new Set<DailyBriefingDeliveryChannel>();
  for (const item of raw) {
    if (item === "email" || item === "whatsapp") {
      set.add(item);
    }
  }
  if (set.size === 0) {
    return ["email"];
  }
  return [...set];
}

export function normalizeSendAtLocal(raw: unknown): string {
  if (typeof raw !== "string") {
    return "06:00";
  }
  const trimmed = raw.trim();
  if (!/^\d{2}:\d{2}$/.test(trimmed)) {
    return "06:00";
  }
  const [hh, mm] = trimmed.split(":").map(Number);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return "06:00";
  }
  return trimmed;
}

export function validateDeliveryPrefsInput(input: {
  enabled: boolean;
  channels: DailyBriefingDeliveryChannel[];
  emailRecipients: string[];
}): { ok: true } | { ok: false; message: string } {
  if (!input.enabled) {
    return { ok: true };
  }
  if (input.channels.includes("email") && input.emailRecipients.length === 0) {
    return {
      ok: false,
      message: "Agrega al menos un email destinatario para activar el envío matutino.",
    };
  }
  if (input.channels.includes("whatsapp")) {
    return {
      ok: false,
      message: "WhatsApp aún no está disponible; usa solo email por ahora.",
    };
  }
  if (!input.channels.includes("email")) {
    return { ok: false, message: "Selecciona al menos el canal email." };
  }
  return { ok: true };
}
