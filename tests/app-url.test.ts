import { describe, expect, it, vi, afterEach } from "vitest";
import { appBaseUrl, orgInvitationRedirectUrl } from "@/lib/app-url";

describe("app-url", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers NEXT_PUBLIC_APP_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://stg.geoagro.ai/");
    expect(appBaseUrl()).toBe("https://stg.geoagro.ai");
    expect(orgInvitationRedirectUrl()).toBe("https://stg.geoagro.ai/app");
  });

  it("falls back to VERCEL_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("VERCEL_URL", "agro-ai-cursor.vercel.app");
    expect(appBaseUrl()).toBe("https://agro-ai-cursor.vercel.app");
  });
});
