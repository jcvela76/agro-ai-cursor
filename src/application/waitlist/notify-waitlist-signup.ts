import { LEGAL_CONTACT_EMAIL } from "@/content/legal/types";
import type { EmailSender } from "@/infrastructure/email/email-sender";

export type WaitlistLead = {
  email: string;
  role: string | null;
  region: string | null;
  crop: string | null;
};

export function resolveWaitlistNotifyTo(
  env: Record<string, string | undefined> = process.env,
): string {
  const override = env.WAITLIST_NOTIFY_TO?.trim();
  if (override && override.includes("@")) {
    return override;
  }
  return LEGAL_CONTACT_EMAIL;
}

export function buildWaitlistNotifyEmail(lead: WaitlistLead): {
  subject: string;
  html: string;
  text: string;
} {
  const lines = [
    `Email: ${lead.email}`,
    `Rol: ${lead.role ?? "—"}`,
    `Región: ${lead.region ?? "—"}`,
    `Cultivo: ${lead.crop ?? "—"}`,
  ];
  const text = ["Nuevo lead waitlist (geoagro.ai)", "", ...lines].join("\n");
  const html = [
    "<p><strong>Nuevo lead waitlist</strong> (geoagro.ai)</p>",
    "<ul>",
    ...lines.map((line) => `<li>${escapeHtml(line)}</li>`),
    "</ul>",
  ].join("");
  return {
    subject: `[Agro AI] Waitlist: ${lead.email}`,
    html,
    text,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Best-effort notify; never throws — signup already persisted. */
export async function notifyWaitlistSignup(
  email: EmailSender,
  lead: WaitlistLead,
  env: Record<string, string | undefined> = process.env,
): Promise<{ attempted: boolean; ok: boolean; error?: string }> {
  if (!env.RESEND_API_KEY?.trim()) {
    return { attempted: false, ok: false, error: "RESEND_API_KEY missing" };
  }
  const to = resolveWaitlistNotifyTo(env);
  const content = buildWaitlistNotifyEmail(lead);
  const result = await email.send({
    to: [to],
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
  return {
    attempted: true,
    ok: result.ok,
    error: result.ok ? undefined : result.error,
  };
}
