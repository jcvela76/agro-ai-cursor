import { describe, expect, it, vi } from "vitest";

vi.mock("@/infrastructure/container", async () => {
  const { spectralRouteContainerMock } = await import("./helpers/spectral-route-mocks");
  return spectralRouteContainerMock;
});

import { GET } from "@/app/api/landing/spectral-overlay/route";
import { LANDING_DEMO_SCENES } from "@/content/landing/spectral-demo";

describe("API GET /api/landing/spectral-overlay", () => {
  it("returns overlay for an allowlisted Ica 2 scene without auth", async () => {
    const scene = LANDING_DEMO_SCENES[LANDING_DEMO_SCENES.length - 1]!;
    const res = await GET(
      new Request(
        `http://localhost/api/landing/spectral-overlay?index=ndre&acquiredAt=${scene.acquisitionDate}`,
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(body.data.kind).toBe("spectral_overlay");
    expect(body.data.indexId).toBe("ndre");
  });

  it("rejects dates outside the public allowlist", async () => {
    const res = await GET(
      new Request(
        "http://localhost/api/landing/spectral-overlay?index=ndre&acquiredAt=2019-01-01",
      ),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.status).toBe("SPECTRAL_LIMITED");
    expect(body.reason).toBe("unsupported_range");
  });
});
