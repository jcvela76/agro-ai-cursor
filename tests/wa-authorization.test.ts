import { describe, expect, it } from "vitest";
import {
  authorizeWeatherAccess,
  authorizeWeatherPlusAccess,
} from "@/domain/auth/authorize-weather-access";
import { defaultSyntheticSnapshots } from "@/infrastructure/auth/synthetic-access-resolver";

const authorized = defaultSyntheticSnapshots[0];
const weatherNoParcel = defaultSyntheticSnapshots[1];
const parcelNoWeather = defaultSyntheticSnapshots[2];
const crossWorkspace = defaultSyntheticSnapshots[3];
const plusUser = defaultSyntheticSnapshots[4];

describe("WA-03: weather entitlement without parcel access", () => {
  it("denies without revealing parcel existence", () => {
    const result = authorizeWeatherAccess(
      weatherNoParcel,
      "parcel-lima-norte-001",
      "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.publicCode).toBe("WEATHER_UNAVAILABLE");
      expect(result.reason).toBe("missing_parcel_access");
    }
  });
});

describe("WA-04: parcel access without weather entitlement", () => {
  it("denies weather even when parcel is listed", () => {
    const result = authorizeWeatherAccess(
      parcelNoWeather,
      "parcel-lima-norte-001",
      "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.publicCode).toBe("WEATHER_UNAVAILABLE");
      expect(result.reason).toBe("missing_weather_entitlement");
    }
  });
});

describe("WA-05: cross-workspace parcel", () => {
  it("denies with indistinguishable public code", () => {
    const result = authorizeWeatherAccess(
      crossWorkspace,
      "parcel-lima-norte-001",
      "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.publicCode).toBe("WEATHER_UNAVAILABLE");
      expect(result.reason).toBe("cross_workspace_parcel");
    }
  });
});

describe("WA-07: Plus gate", () => {
  it("allows Plus only when weather_plus entitlement is present", () => {
    expect(authorizeWeatherPlusAccess(authorized)).toBe(false);
    expect(authorizeWeatherPlusAccess(plusUser)).toBe(true);
  });
});

describe("WA-01 path: authorized access snapshot", () => {
  it("authorizes weather for entitled user with parcel access", () => {
    const result = authorizeWeatherAccess(
      authorized,
      "parcel-lima-norte-001",
      "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.parcelId).toBe("parcel-lima-norte-001");
    }
  });
});

describe("ADR-011: empty authorizedParcelIds allows all org parcels", () => {
  it("authorizes when allowlist is empty and org matches", () => {
    const orgWide = defaultSyntheticSnapshots[5];
    const result = authorizeWeatherAccess(
      orgWide,
      "parcel-lima-norte-001",
      "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G",
    );
    expect(result.ok).toBe(true);
  });
});
