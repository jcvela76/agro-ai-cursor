import { describe, expect, it } from "vitest";
import { agroAgentToolNames } from "@/agents/agro-agent/tools";
import {
  agentToolNoteForName,
  agentToolNoteForParts,
  extractToolNamesFromParts,
} from "@/content/agent/tool-notes";

describe("agent tool notes", () => {
  it("maps known tools to Spanish status lines", () => {
    expect(agentToolNoteForName(agroAgentToolNames.vegetationIndices)).toContain("espectral");
    expect(agentToolNoteForName(agroAgentToolNames.forecast)).toContain("pronóstico");
  });

  it("extracts tool names from AI SDK parts", () => {
    expect(
      extractToolNamesFromParts([
        { type: "tool-invocation", toolName: agroAgentToolNames.observation },
        { type: `tool-${agroAgentToolNames.gdd}` },
      ]),
    ).toEqual([agroAgentToolNames.observation, agroAgentToolNames.gdd]);
  });

  it("uses the latest tool for the status line", () => {
    expect(
      agentToolNoteForParts([
        { type: `tool-${agroAgentToolNames.observation}` },
        { type: `tool-${agroAgentToolNames.vegetationIndices}` },
      ]),
    ).toBe(agentToolNoteForName(agroAgentToolNames.vegetationIndices));
  });
});
