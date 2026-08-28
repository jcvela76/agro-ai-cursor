import { describe, expect, it, vi, afterEach } from "vitest";
import { appBaseUrl, orgInvitationRedirectUrl } from "@/lib/app-url";

describe("app-url", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers NEXT_PUBLIC_APP_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://stg.geoagro.ai/");
    expect(appBaseUrl()).toBe("https://stg.geoagro.ai");
    expect(orgInvitationRedirectUrl()).toBe("https://stg.geoagro.ai/accept-invitation");
  });

  it("uses request host when env is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const request = new Request("https://stg.geoagro.ai/app/admin", {
      headers: { host: "stg.geoagro.ai" },
    });
    expect(appBaseUrl({ request })).toBe("https://stg.geoagro.ai");
    expect(orgInvitationRedirectUrl({ request })).toBe("https://stg.geoagro.ai/accept-invitation");
  });

  it("maps stg branch to staging canonical host", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "stg");
    vi.stubEnv("VERCEL_URL", "agro-ai-cursor.vercel.app");
    expect(appBaseUrl()).toBe("https://stg.geoagro.ai");
  });

  it("falls back to VERCEL_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "");
    vi.stubEnv("VERCEL_URL", "agro-ai-cursor.vercel.app");
    expect(appBaseUrl()).toBe("https://agro-ai-cursor.vercel.app");
  });
});
