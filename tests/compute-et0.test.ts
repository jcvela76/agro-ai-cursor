import { describe, expect, it } from "vitest";
import {
  accumulateEt0,
  dailyHargreavesEt0,
  dayOfYearFromIsoDate,
  ET0_CALCULATION_METHOD_ID,
  extraterrestrialRadiationMm,
} from "@/domain/weather/compute-et0";

describe("compute-et0 Hargreaves–Samani", () => {
  it("maps ISO date to day of year", () => {
    expect(dayOfYearFromIsoDate("2026-01-01")).toBe(1);
    expect(dayOfYearFromIsoDate("2026-08-23")).toBe(235);
  });

  it("computes positive Ra near equator and known-answer daily ET0", () => {
    const ra = extraterrestrialRadiationMm(-11.95, 235);
    expect(ra).toBeGreaterThan(5);
    expect(ra).toBeLessThan(20);

    const et0 = dailyHargreavesEt0(24, 14, -11.95, 235);
    expect(et0).not.toBeNull();
    expect(et0!).toBeGreaterThan(0);
    expect(et0!).toBeLessThan(15);
  });

  it("rejects invalid Tmax < Tmin", () => {
    expect(dailyHargreavesEt0(10, 20, -12, 100)).toBeNull();
  });

  it("accumulates ET0 and skips invalid days", () => {
    const result = accumulateEt0(
      [
        { date: "2026-01-02", tempMaxCelsius: 24, tempMinCelsius: 14 },
        { date: "2026-01-01", tempMaxCelsius: 10, tempMinCelsius: 20 },
        { date: "2026-01-03", tempMaxCelsius: 22, tempMinCelsius: 12 },
      ],
      -11.95,
    );
    expect(result).not.toBeNull();
    expect(result!.daysIncluded).toBe(2);
    expect(result!.periodStart).toBe("2026-01-02");
    expect(result!.periodEnd).toBe("2026-01-03");
    expect(result!.totalEt0Mm).toBeGreaterThan(0);
  });

  it("exposes approved calculator id", () => {
    expect(ET0_CALCULATION_METHOD_ID).toBe("et0-hargreaves-samani-calendar-ytd/v1");
  });
});
