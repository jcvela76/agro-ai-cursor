import { describe, expect, it } from "vitest";
import { createParcelRegistry } from "@/infrastructure/container";
import { SyntheticParcelRegistry } from "@/infrastructure/parcel/synthetic-parcel-registry";

describe("QA-1: parcel registry factory", () => {
  it("uses offline registry when DATABASE_URL is unset", () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const registry = createParcelRegistry();
      expect(registry).toBeInstanceOf(SyntheticParcelRegistry);
    } finally {
      if (previous === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previous;
      }
    }
  });
});
