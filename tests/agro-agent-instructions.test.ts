import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { join } from "node:path";

describe("Agro Agent instructions", () => {
  it("includes evidence-based guidance for WQ-18", () => {
    const text = readFileSync(
      join(process.cwd(), "src/agents/agro-agent/instructions.md"),
      "utf8",
    );
    expect(text).toContain("Orientación basada en evidencia");
    expect(text).toContain("getParcelVegetationIndices");
    expect(text).toContain("validTo");
    expect(text).toMatch(/decisi[oó]n final.*agr[oó]nomo/i);
  });
});
