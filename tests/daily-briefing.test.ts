import { describe, expect, it } from "vitest";
import { buildDailyBriefingDeltas } from "@/domain/report/daily-briefing";
import type { DailyBriefingSignal } from "@/domain/report/daily-briefing";

describe("daily briefing deltas", () => {
  it("returns empty when no previous signals", () => {
    const current: DailyBriefingSignal[] = [
      { id: "rain_30d", label: "Lluvia 30d", value: 12, unit: "mm", source: "stub", validity: "2026-08" },
    ];
    expect(buildDailyBriefingDeltas(current, undefined)).toEqual([]);
  });

  it("detects numeric changes", () => {
    const previous: DailyBriefingSignal[] = [
      { id: "rain_30d", label: "Lluvia 30d", value: 10, unit: "mm", source: "stub", validity: "2026-08" },
    ];
    const current: DailyBriefingSignal[] = [
      { id: "rain_30d", label: "Lluvia 30d", value: 15, unit: "mm", source: "stub", validity: "2026-08" },
    ];
    const deltas = buildDailyBriefingDeltas(current, previous);
    expect(deltas).toHaveLength(1);
    expect(deltas[0]?.direction).toBe("up");
  });
});
