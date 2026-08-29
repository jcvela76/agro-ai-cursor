import { describe, expect, it } from "vitest";
import {
  accumulateGdd,
  GDD_BASE_TEMP_CELSIUS,
  GDD_CALCULATION_METHOD_ID,
} from "@/domain/weather/compute-gdd";

describe("accumulateGdd", () => {
  it("sums max(0, mean - base) and rounds to 2 decimals", () => {
    const result = accumulateGdd([
      { date: "2026-01-02", tempMaxCelsius: 24, tempMinCelsius: 16 },
      { date: "2026-01-01", tempMaxCelsius: 18, tempMinCelsius: 8 },
      { date: "2026-01-03", tempMaxCelsius: 12, tempMinCelsius: 6 },
    ]);
    expect(result).not.toBeNull();
    // day1: (18+8)/2 - 10 = 3; day2: (24+16)/2 - 10 = 10; day3: (12+6)/2 - 10 = 0
    expect(result!.totalGdd).toBe(13);
    expect(result!.daysIncluded).toBe(3);
    expect(result!.periodStart).toBe("2026-01-01");
    expect(result!.periodEnd).toBe("2026-01-03");
    expect(result!.baseTempCelsius).toBe(GDD_BASE_TEMP_CELSIUS);
  });

  it("returns null for empty input", () => {
    expect(accumulateGdd([])).toBeNull();
  });
});

describe("GDD method constants", () => {
  it("exposes approved calculator id", () => {
    expect(GDD_CALCULATION_METHOD_ID).toBe("gdd-mean-base-campaign/v2");
  });
});
