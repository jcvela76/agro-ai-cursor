export interface SendEmailInput {
  to: string[];
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  ok: boolean;
  provider: string;
  messageId?: string;
  error?: string;
}

export interface EmailSender {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

/** In-memory / log sender for tests and local without RESEND_API_KEY. */
export class StubEmailSender implements EmailSender {
  readonly sent: SendEmailInput[] = [];

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    this.sent.push(input);
    return {
      ok: true,
      provider: "stub",
      messageId: `stub-${this.sent.length}`,
    };
  }
}

export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (input.to.length === 0) {
      return { ok: false, provider: "resend", error: "No recipients" };
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.from,
          to: input.to,
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
        name?: string;
      };

      if (!res.ok) {
        return {
          ok: false,
          provider: "resend",
          error: json.message ?? json.name ?? `HTTP ${res.status}`,
        };
      }

      return {
        ok: true,
        provider: "resend",
        messageId: json.id,
      };
    } catch (error) {
      return {
        ok: false,
        provider: "resend",
        error: error instanceof Error ? error.message : "Resend request failed",
      };
    }
  }
}

export function createEmailSender(): EmailSender {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return new StubEmailSender();
  }
  const from =
    process.env.REPORT_EMAIL_FROM?.trim() || "Agro AI <noreply@geoagro.ai>";
  return new ResendEmailSender(apiKey, from);
}
