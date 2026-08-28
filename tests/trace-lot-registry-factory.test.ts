import { describe, expect, it } from "vitest";
import { createTraceLotRegistry } from "@/infrastructure/container";
import { OfflineTraceLotRegistry } from "@/infrastructure/traceability/offline-trace-lot-registry";

describe("QA-5: trace lot registry factory", () => {
  it("uses offline registry when DATABASE_URL is unset", () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const registry = createTraceLotRegistry();
      expect(registry).toBeInstanceOf(OfflineTraceLotRegistry);
    } finally {
      if (previous === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previous;
      }
    }
  });
});
