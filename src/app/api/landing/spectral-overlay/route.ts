import { isVegetationIndexId } from "@/application/spectral/get-parcel-spectral-overlay";
import { findLandingDemoScene } from "@/content/landing/spectral-demo";
import { getLandingDemoSpectralOverlay } from "@/infrastructure/container";
import {
  spectralErrorResponse,
  spectralSuccessResponse,
} from "@/infrastructure/http/spectral-response";

export const maxDuration = 60;

const LANDING_OVERLAY_CACHE_SECONDS = 86_400;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const indexParam = url.searchParams.get("index") ?? "ndre";
  const acquisitionDate = url.searchParams.get("acquiredAt") ?? "";

  if (!isVegetationIndexId(indexParam)) {
    return spectralErrorResponse({
      ok: false,
      reason: "unavailable",
      message: "Invalid vegetation index.",
    });
  }

  if (!findLandingDemoScene(acquisitionDate)) {
    return spectralErrorResponse({
      ok: false,
      reason: "unsupported_range",
      message: "Escena no disponible en la demo pública.",
    });
  }

  const result = await getLandingDemoSpectralOverlay.execute({
    indexId: indexParam,
    acquisitionDate,
  });

  if (!result.ok) {
    return spectralErrorResponse(result);
  }

  const cacheSeconds =
    result.data.rendering === "sentinel_raster" ? LANDING_OVERLAY_CACHE_SECONDS : null;
  const response = spectralSuccessResponse(result.data, { cacheSeconds });
  if (cacheSeconds) {
    response.headers.set(
      "Cache-Control",
      `public, s-maxage=${cacheSeconds}, stale-while-revalidate=604800`,
    );
  }
  return response;
}
