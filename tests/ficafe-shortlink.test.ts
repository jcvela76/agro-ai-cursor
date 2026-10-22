import { describe, expect, it } from "vitest";
import { GET } from "../src/app/f26/route";

describe("FICAFÉ short link", () => {
  it("redirects temporarily to sign-up with the original campaign parameters", () => {
    const response = GET();
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://geoagro.ai/sign-up?utm_source=ficafe&utm_medium=card&utm_campaign=ficafe_cusco_202611",
    );
    expect(location.origin).toBe("https://geoagro.ai");
    expect(location.pathname).toBe("/sign-up");
    expect([...location.searchParams.entries()]).toEqual([
      ["utm_source", "ficafe"],
      ["utm_medium", "card"],
      ["utm_campaign", "ficafe_cusco_202611"],
    ]);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
  });
});
