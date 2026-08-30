import type { Map as MapLibreMap } from "maplibre-gl";
import { LngLatBounds } from "maplibre-gl";
import { LANDING_DEMO_GEOMETRY } from "@/content/landing/spectral-demo";

export type HeroLayoutTier = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export function heroLayoutTier(width = window.innerWidth): HeroLayoutTier {
  if (width >= 1536) return "2xl";
  if (width >= 1280) return "xl";
  if (width >= 1024) return "lg";
  if (width >= 768) return "md";
  if (width >= 640) return "sm";
  return "xs";
}

function maxZoomForTier(tier: HeroLayoutTier): number {
  if (tier === "2xl") return 17.25;
  if (tier === "xl") return 17;
  if (tier === "lg") return 16.5;
  if (tier === "md") return 16;
  if (tier === "sm") return 15.5;
  return 15;
}

function parsePx(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function fitLandingDemoParcel(
  map: MapLibreMap,
  options?: {
    shell?: HTMLElement | null;
    copyRight?: number;
    panelLeft?: number;
    spectralHeight?: number;
  },
) {
  const bounds = new LngLatBounds();
  for (const [lng, lat] of LANDING_DEMO_GEOMETRY.coordinates[0]) {
    bounds.extend([lng, lat]);
  }

  const width = window.innerWidth;
  const tier = heroLayoutTier(width);
  const shellStyles = options?.shell ? getComputedStyle(options.shell) : null;
  const gutter = shellStyles ? parsePx(shellStyles.getPropertyValue("--hero-gutter")) : 24;

  let padding: { top: number; bottom: number; left: number; right: number };

  if (tier === "lg" || tier === "xl" || tier === "2xl") {
    if (options?.copyRight != null && options?.panelLeft != null) {
      padding = {
        top: tier === "2xl" ? 104 : 96,
        bottom: tier === "2xl" ? 80 : 72,
        left: options.copyRight + 16,
        right: width - options.panelLeft + 16,
      };
    } else {
      padding = {
        top: 96,
        bottom: 72,
        left: tier === "2xl" ? 380 : tier === "xl" ? 360 : 320,
        right: tier === "2xl" ? 360 : tier === "xl" ? 340 : 300,
      };
    }
  } else if (tier === "md") {
    const copyInset = options?.copyRight ?? gutter + Math.min(width * 0.42, 416);
    padding = {
      top: 88,
      bottom: 88,
      left: copyInset + 16,
      right: 336,
    };
  } else {
    const sheetHeight = options?.spectralHeight ?? Math.min(window.innerHeight * 0.55, 448);
    padding = {
      top: tier === "sm" ? 80 : 72,
      bottom: sheetHeight + 24,
      left: gutter,
      right: gutter,
    };
  }

  map.fitBounds(bounds, {
    padding,
    maxZoom: maxZoomForTier(tier),
  });
}
