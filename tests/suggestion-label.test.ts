import { describe, expect, it } from "vitest";
import {
  formatSuggestionLabel,
  parseSuggestionLabel,
  parseSuggestionLabelFromDecision,
  tallySuggestionLabels,
} from "@/domain/report/suggestion-label";

describe("suggestion-label", () => {
  it("parses the pilot tag", () => {
    const parsed = parseSuggestionLabel(
      "report:rpt-abc suggestion:water verdict:agree — suelo seco al tacto",
    );
    expect(parsed).toEqual({
      reportId: "rpt-abc",
      theme: "water",
      verdict: "agree",
      raw: "report:rpt-abc suggestion:water verdict:agree",
    });
  });

  it("prefers rationale over summary", () => {
    const parsed = parseSuggestionLabelFromDecision({
      summary: "NDWI check",
      rationale: formatSuggestionLabel({
        reportId: "rpt-1",
        theme: "vegetation",
        verdict: "partial",
      }),
    });
    expect(parsed?.theme).toBe("vegetation");
    expect(parsed?.verdict).toBe("partial");
  });

  it("tallies agree rate excluding partial from denominator", () => {
    const rows = tallySuggestionLabels([
      { theme: "water", verdict: "agree" },
      { theme: "water", verdict: "agree" },
      { theme: "water", verdict: "disagree" },
      { theme: "water", verdict: "partial" },
      { theme: "vegetation", verdict: "disagree" },
    ]);
    expect(rows).toEqual([
      {
        theme: "vegetation",
        agree: 0,
        disagree: 1,
        partial: 0,
        total: 1,
        agreeRate: 0,
      },
      {
        theme: "water",
        agree: 2,
        disagree: 1,
        partial: 1,
        total: 4,
        agreeRate: 2 / 3,
      },
    ]);
  });
});
