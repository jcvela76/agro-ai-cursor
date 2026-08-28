export interface DailyBriefingSignal {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  source: string;
  validity: string;
}

export interface DailyBriefingSuggestion {
  theme: "water" | "weather" | "vegetation" | "operations";
  text: string;
  confidence: "low" | "medium" | "high";
  evidenceRefs: string[];
}

export interface DailyBriefingContextSnapshot {
  reportDay: string;
  parcelId: string;
  parcelName: string;
  signals: DailyBriefingSignal[];
  suggestions: DailyBriefingSuggestion[];
  openQuestions: string[];
  limits: string[];
}

export interface DailyBriefingDelta {
  signalId: string;
  label: string;
  previousValue: string;
  currentValue: string;
  direction: "up" | "down" | "flat" | "new" | "removed";
}

export function buildDailyBriefingDeltas(
  current: DailyBriefingSignal[],
  previous: DailyBriefingSignal[] | undefined,
): DailyBriefingDelta[] {
  if (!previous?.length) {
    return [];
  }

  const prevMap = new Map(previous.map((s) => [s.id, s]));
  const deltas: DailyBriefingDelta[] = [];

  for (const signal of current) {
    const prior = prevMap.get(signal.id);
    const currentValue = formatSignalValue(signal);
    if (!prior) {
      deltas.push({
        signalId: signal.id,
        label: signal.label,
        previousValue: "—",
        currentValue,
        direction: "new",
      });
      continue;
    }
    const previousValue = formatSignalValue(prior);
    const direction = compareSignalDirection(prior.value, signal.value);
    if (direction !== "flat" || previousValue !== currentValue) {
      deltas.push({
        signalId: signal.id,
        label: signal.label,
        previousValue,
        currentValue,
        direction,
      });
    }
    prevMap.delete(signal.id);
  }

  for (const [id, prior] of prevMap) {
    deltas.push({
      signalId: id,
      label: prior.label,
      previousValue: formatSignalValue(prior),
      currentValue: "—",
      direction: "removed",
    });
  }

  return deltas;
}

function formatSignalValue(signal: DailyBriefingSignal): string {
  if (typeof signal.value === "number") {
    return signal.unit ? `${signal.value} ${signal.unit}` : String(signal.value);
  }
  return signal.value;
}

function compareSignalDirection(
  previous: number | string,
  current: number | string,
): DailyBriefingDelta["direction"] {
  if (typeof previous === "number" && typeof current === "number") {
    if (current > previous) return "up";
    if (current < previous) return "down";
    return "flat";
  }
  if (previous === current) return "flat";
  return "flat";
}
