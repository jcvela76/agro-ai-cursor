import { describe, expect, it } from "vitest";
import {
  approximateAreaHectares,
  demoParcelSquare,
  DEMO_PARCEL_DELTA_DEG,
  squareAround,
} from "@/domain/parcel/geometry";

describe("demo parcel geometry", () => {
  it("demoParcelSquare is ~4.8 ha at Lima demo coordinates", () => {
    const geometry = demoParcelSquare(-77.05, -11.95);
    expect(approximateAreaHectares(geometry)).toBeCloseTo(4.8, 0);
  });

  it("uses a much smaller delta than the legacy 0.01 seed square", () => {
    expect(DEMO_PARCEL_DELTA_DEG).toBeLessThan(0.01);
    const legacy = approximateAreaHectares(squareAround(-77.05, -11.95, 0.01));
    const demo = approximateAreaHectares(demoParcelSquare(-77.05, -11.95));
    expect(demo).toBeLessThan(legacy / 50);
  });
});
