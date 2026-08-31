import { describe, expect, it } from "vitest";
import {
  LANDING_AGENT_SCENARIOS,
  findLandingAgentScenario,
  nextLandingAgentScenarioId,
} from "@/content/landing/agent-demo";

describe("landing agent demo content", () => {
  it("has unique scenario ids and non-empty markdown", () => {
    const ids = LANDING_AGENT_SCENARIOS.map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const scenario of LANDING_AGENT_SCENARIOS) {
      expect(scenario.userQuestion.length).toBeGreaterThan(10);
      expect(scenario.assistantMarkdown.length).toBeGreaterThan(80);
      expect(scenario.toolNote.length).toBeGreaterThan(5);
      expect(scenario.chipLabel.length).toBeGreaterThan(3);
    }
  });

  it("ndre scenario cites real scene dates from spectral demo", () => {
    const ndre = findLandingAgentScenario("ndre-trend");
    expect(ndre).toBeDefined();
    expect(ndre?.assistantMarkdown).toContain("12 ago");
    expect(ndre?.assistantMarkdown).toContain("CDSE Sentinel-2");
  });

  it("cycles scenarios in order", () => {
    const first = LANDING_AGENT_SCENARIOS[0].id;
    const second = nextLandingAgentScenarioId(first);
    const third = nextLandingAgentScenarioId(second);
    const wrap = nextLandingAgentScenarioId(third);
    expect(wrap).toBe(first);
  });
});
