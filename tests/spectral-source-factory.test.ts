import { describe, expect, it } from "vitest";
import { createSpectralSource } from "@/infrastructure/container";
import { OfflineSpectralSource } from "@/infrastructure/spectral/offline-spectral-source";
import { SentinelHubStubSpectralSource } from "@/infrastructure/spectral/sentinel-hub-stub-spectral-source";
import { SentinelHubSpectralSource } from "@/infrastructure/spectral/sentinel-hub-spectral-source";

describe("QA-3: spectral source factory", () => {
  it("defaults to offline source", () => {
    const previous = process.env.SPECTRAL_SOURCE;
    delete process.env.SPECTRAL_SOURCE;
    try {
      expect(createSpectralSource()).toBeInstanceOf(OfflineSpectralSource);
    } finally {
      if (previous === undefined) {
        delete process.env.SPECTRAL_SOURCE;
      } else {
        process.env.SPECTRAL_SOURCE = previous;
      }
    }
  });

  it("selects sentinel hub stub without live API", () => {
    expect(createSpectralSource("sentinel_hub_stub")).toBeInstanceOf(
      SentinelHubStubSpectralSource,
    );
  });

  it("selects live sentinel hub when credentials are present", () => {
    const prevId = process.env.SENTINEL_CLIENT_ID;
    const prevSecret = process.env.SENTINEL_CLIENT_SECRET;
    process.env.SENTINEL_CLIENT_ID = "sh-test-id";
    process.env.SENTINEL_CLIENT_SECRET = "sh-test-secret";
    try {
      expect(createSpectralSource("sentinel_hub")).toBeInstanceOf(SentinelHubSpectralSource);
    } finally {
      if (prevId === undefined) delete process.env.SENTINEL_CLIENT_ID;
      else process.env.SENTINEL_CLIENT_ID = prevId;
      if (prevSecret === undefined) delete process.env.SENTINEL_CLIENT_SECRET;
      else process.env.SENTINEL_CLIENT_SECRET = prevSecret;
    }
  });

  it("falls back to offline when live mode lacks credentials", () => {
    const prevId = process.env.SENTINEL_CLIENT_ID;
    const prevSecret = process.env.SENTINEL_CLIENT_SECRET;
    delete process.env.SENTINEL_CLIENT_ID;
    delete process.env.SENTINEL_CLIENT_SECRET;
    try {
      expect(createSpectralSource("sentinel_hub")).toBeInstanceOf(OfflineSpectralSource);
    } finally {
      if (prevId === undefined) delete process.env.SENTINEL_CLIENT_ID;
      else process.env.SENTINEL_CLIENT_ID = prevId;
      if (prevSecret === undefined) delete process.env.SENTINEL_CLIENT_SECRET;
      else process.env.SENTINEL_CLIENT_SECRET = prevSecret;
    }
  });
});
