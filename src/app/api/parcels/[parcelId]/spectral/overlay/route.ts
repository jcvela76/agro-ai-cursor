import { auth } from "@clerk/nextjs/server";
import { createAccessResolver, getParcelSpectralOverlay } from "@/infrastructure/container";
import { isVegetationIndexId } from "@/application/spectral/get-parcel-spectral-overlay";
import {
  spectralErrorResponse,
  spectralSuccessResponse,
} from "@/infrastructure/http/spectral-response";

export async function GET(
  request: Request,
  context: { params: Promise<{ parcelId: string }> },
) {
  const { userId, orgId } = await auth();
  const { parcelId } = await context.params;
  const indexParam = new URL(request.url).searchParams.get("index") ?? "ndre";

  if (!isVegetationIndexId(indexParam)) {
    return spectralErrorResponse({
      ok: false,
      reason: "unavailable",
      message: "Invalid vegetation index.",
    });
  }

  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);

  const result = await getParcelSpectralOverlay.execute({
    authority,
    parcelId,
    indexId: indexParam,
  });

  if (!result.ok) {
    return spectralErrorResponse(result);
  }

  // Never HTTP-cache synthetic fallback — a one-off Process miss must not stick for 5 minutes.
  const cacheSeconds = result.data.rendering === "sentinel_raster" ? 300 : null;
  return spectralSuccessResponse(result.data, { cacheSeconds });
}
