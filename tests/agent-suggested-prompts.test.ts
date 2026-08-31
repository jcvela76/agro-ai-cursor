import { describe, expect, it } from "vitest";
import {
  AGENT_SUGGESTED_PROMPTS,
  buildAgentSuggestedPrompts,
  findAgentSuggestedPrompt,
} from "@/content/agent/suggested-prompts";

describe("agent suggested prompts", () => {
  it("has unique ids and non-empty prompts in defaults", () => {
    const ids = AGENT_SUGGESTED_PROMPTS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const item of AGENT_SUGGESTED_PROMPTS) {
      expect(item.label.length).toBeGreaterThan(3);
      expect(item.prompt.length).toBeGreaterThan(10);
    }
  });

  it("finds prompts by id", () => {
    expect(findAgentSuggestedPrompt("temperature")?.prompt).toContain("temperatura");
  });

  it("returns crop-specific prompts for café", () => {
    const cafe = buildAgentSuggestedPrompts({ cropKey: "cafe" });
    expect(cafe).toHaveLength(3);
    expect(cafe.some((item) => item.id === "rain-campaign")).toBe(true);
  });

  it("falls back to defaults without crop", () => {
    expect(buildAgentSuggestedPrompts()).toEqual(AGENT_SUGGESTED_PROMPTS);
  });
});
