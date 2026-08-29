import { describe, expect, it } from "vitest";
import {
  buildParcelProfileContextBlock,
  emptyParcelAgronomicProfile,
  profileGaps,
  resolveCampaignWindow,
  resolveGddBaseCelsius,
} from "@/domain/parcel/agronomic-profile";
import { buildAgroAgentSystemPrompt } from "@/agents/agro-agent/build-system-prompt";
import { CROP_GDD_BASE, kcForCrop } from "@/domain/parcel/crop-catalog";
import { synthesizeDailyBriefingDeterministic } from "@/application/report/synthesize-daily-briefing";
import { isAridCoastHeuristic } from "@/application/report/collect-parcel-signals";

describe("agronomic profile campaign + gaps", () => {
  it("prioritizes crop then sowing gaps", () => {
    const profile = emptyParcelAgronomicProfile("org", "p1");
    expect(profileGaps(profile)[0]).toBe("crop");
    profile.cropKey = "cafe";
    profile.crop = "Café";
    expect(profileGaps(profile)[0]).toBe("sowing_date");
  });

  it("uses sowing date for campaign window when valid", () => {
    const profile = emptyParcelAgronomicProfile("org", "p1");
    profile.sowingDate = "2026-03-15";
    const window = resolveCampaignWindow(profile, new Date("2026-08-29T12:00:00Z"));
    expect(window.source).toBe("sowing");
    expect(window.startDate).toBe("2026-03-15");
  });

  it("falls back to calendar YTD without sowing", () => {
    const profile = emptyParcelAgronomicProfile("org", "p1");
    const window = resolveCampaignWindow(profile, new Date("2026-08-29T12:00:00Z"));
    expect(window.source).toBe("calendar_ytd");
    expect(window.startDate).toBe("2026-01-01");
  });

  it("resolves GDD base from crop catalog and override", () => {
    expect(resolveGddBaseCelsius({ cropKey: "papa", gddBaseCelsius: null })).toBe(
      CROP_GDD_BASE.papa,
    );
    expect(resolveGddBaseCelsius({ cropKey: "papa", gddBaseCelsius: 7 })).toBe(7);
  });

  it("injects profile context into agent system prompt", () => {
    const profile = emptyParcelAgronomicProfile("org", "parcel-1");
    const prompt = buildAgroAgentSystemPrompt({ parcelId: "parcel-1", profile });
    expect(prompt).toContain("Contexto de parcela");
    expect(prompt).toContain("gaps prioritarios");
    expect(prompt).toContain("parcel-1");
    expect(buildParcelProfileContextBlock(profile)).toContain("crop");
  });
});

describe("ETc orientative Kc", () => {
  it("maps mid-season Kc for cafe", () => {
    const kc = kcForCrop("cafe", "floración");
    expect(kc?.stage).toBe("mid");
    expect(kc?.kc).toBeGreaterThan(0.5);
  });
});

describe("briefing thresholds + arid coast", () => {
  it("detects arid coast heuristic for Lima", () => {
    expect(isAridCoastHeuristic(-12.0, -77.0)).toBe(true);
    expect(isAridCoastHeuristic(-13.5, -71.5)).toBe(false); // Cusco inland
  });

  it("softens low-rain suggestion on arid coast and asks for profile gaps", () => {
    const result = synthesizeDailyBriefingDeterministic({
      aridCoast: true,
      profileGaps: ["sowing_date"],
      signals: [
        {
          id: "rain_30d",
          label: "Lluvia 30d",
          value: 2,
          unit: "mm",
          source: "test",
          validity: "—",
        },
      ],
    });
    expect(result.suggestions.some((s) => s.text.includes("costa árida"))).toBe(true);
    expect(result.suggestions.some((s) => s.text.includes("sowing_date"))).toBe(true);
    expect(result.suggestions.some((s) => s.text.includes("piloto_generico"))).toBe(true);
  });
});
