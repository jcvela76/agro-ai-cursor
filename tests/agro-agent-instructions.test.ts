import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearAgroAgentInstructionsCache,
  loadAgroAgentInstructions,
} from "@/agents/agro-agent/load-instructions";

const instructionsPath = join(process.cwd(), "src/agents/agro-agent/instructions.md");

describe("Agro Agent instructions", () => {
  afterEach(() => {
    clearAgroAgentInstructionsCache();
  });

  it("includes evidence-based guidance and forbidden refusal phrases", () => {
    const text = readFileSync(instructionsPath, "utf8");
    expect(text).toContain("Orientación basada en evidencia");
    expect(text).toContain("Frases prohibidas");
    expect(text).toContain("Playbook riego / humedad");
    expect(text).toContain("getParcelVegetationIndices");
    expect(text).toContain("<details>");
    expect(text).toContain("Ver evidencia consultada");
    expect(text).toContain("NDWI");
  });

  it("reloads instructions in non-production after file change", () => {
    const original = readFileSync(instructionsPath, "utf8");
    vi.stubEnv("NODE_ENV", "development");
    try {
      const first = loadAgroAgentInstructions();
      writeFileSync(instructionsPath, `${original}\n<!-- test-marker -->\n`, "utf8");
      const second = loadAgroAgentInstructions();
      expect(second).toContain("test-marker");
      expect(second).not.toBe(first);
    } finally {
      writeFileSync(instructionsPath, original, "utf8");
      vi.unstubAllEnvs();
      clearAgroAgentInstructionsCache();
    }
  });
});
