import { describe, expect, it } from "vitest";
import {
  buildWaitlistNotifyEmail,
  notifyWaitlistSignup,
  resolveWaitlistNotifyTo,
} from "@/application/waitlist/notify-waitlist-signup";
import { LEGAL_CONTACT_EMAIL } from "@/content/legal/types";
import { StubEmailSender } from "@/infrastructure/email/email-sender";

describe("notifyWaitlistSignup", () => {
  it("defaults notify to LEGAL_CONTACT_EMAIL", () => {
    expect(resolveWaitlistNotifyTo({})).toBe(LEGAL_CONTACT_EMAIL);
  });

  it("allows WAITLIST_NOTIFY_TO override", () => {
    expect(resolveWaitlistNotifyTo({ WAITLIST_NOTIFY_TO: "ops@example.com" })).toBe(
      "ops@example.com",
    );
  });

  it("skips send without RESEND_API_KEY", async () => {
    const stub = new StubEmailSender();
    const result = await notifyWaitlistSignup(
      stub,
      { email: "lead@example.com", role: null, region: null, crop: null },
      {},
    );
    expect(result.attempted).toBe(false);
    expect(stub.sent).toHaveLength(0);
  });

  it("sends a lead summary email when Resend is configured", async () => {
    const stub = new StubEmailSender();
    const result = await notifyWaitlistSignup(
      stub,
      {
        email: "lead@example.com",
        role: "productor",
        region: "Ica",
        crop: "uva",
      },
      { RESEND_API_KEY: "re_test" },
    );
    expect(result.ok).toBe(true);
    expect(stub.sent).toHaveLength(1);
    expect(stub.sent[0]?.to).toEqual([LEGAL_CONTACT_EMAIL]);
    expect(stub.sent[0]?.subject).toContain("lead@example.com");
    expect(stub.sent[0]?.text).toContain("Ica");
  });

  it("builds html and text with qualifiers", () => {
    const content = buildWaitlistNotifyEmail({
      email: "a@b.com",
      role: null,
      region: "Cusco",
      crop: null,
    });
    expect(content.text).toContain("Cusco");
    expect(content.html).toContain("Cusco");
  });
});
