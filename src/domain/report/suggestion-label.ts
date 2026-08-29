/**
 * Pilot convention for scoring report/briefing suggestions via Agronomic Review.
 *
 * Put this tag in `rationale` (or `summary`) when appending a review decision:
 *
 *   report:<reportId> suggestion:<theme> verdict:agree|disagree|partial
 *
 * Optional free-text note may follow on the same or next lines.
 *
 * Themes align with DailyBriefingSuggestion.theme:
 *   water | vegetation | weather | operations
 */

export type SuggestionVerdict = "agree" | "disagree" | "partial";

export type SuggestionTheme = "water" | "vegetation" | "weather" | "operations" | string;

export interface ParsedSuggestionLabel {
  reportId: string;
  theme: SuggestionTheme;
  verdict: SuggestionVerdict;
  raw: string;
}

export interface SuggestionLabelTally {
  theme: string;
  agree: number;
  disagree: number;
  partial: number;
  total: number;
  agreeRate: number | null;
}

const TAG_RE =
  /\breport:([^\s]+)\s+suggestion:([^\s]+)\s+verdict:(agree|disagree|partial)\b/i;

export function parseSuggestionLabel(text: string): ParsedSuggestionLabel | null {
  const match = text.match(TAG_RE);
  if (!match) {
    return null;
  }
  return {
    reportId: match[1],
    theme: match[2].toLowerCase(),
    verdict: match[3].toLowerCase() as SuggestionVerdict,
    raw: match[0],
  };
}

export function parseSuggestionLabelFromDecision(input: {
  summary: string;
  rationale: string;
}): ParsedSuggestionLabel | null {
  return parseSuggestionLabel(input.rationale) ?? parseSuggestionLabel(input.summary);
}

export function formatSuggestionLabel(input: {
  reportId: string;
  theme: SuggestionTheme;
  verdict: SuggestionVerdict;
}): string {
  return `report:${input.reportId} suggestion:${input.theme} verdict:${input.verdict}`;
}

export function tallySuggestionLabels(
  labels: ReadonlyArray<Pick<ParsedSuggestionLabel, "theme" | "verdict">>,
): SuggestionLabelTally[] {
  const byTheme = new Map<
    string,
    { agree: number; disagree: number; partial: number }
  >();

  for (const label of labels) {
    const theme = label.theme;
    const bucket = byTheme.get(theme) ?? { agree: 0, disagree: 0, partial: 0 };
    bucket[label.verdict] += 1;
    byTheme.set(theme, bucket);
  }

  return [...byTheme.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([theme, counts]) => {
      const total = counts.agree + counts.disagree + counts.partial;
      const scored = counts.agree + counts.disagree;
      return {
        theme,
        ...counts,
        total,
        agreeRate: scored > 0 ? counts.agree / scored : null,
      };
    });
}
