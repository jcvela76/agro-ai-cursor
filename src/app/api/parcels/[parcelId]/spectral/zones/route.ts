import { auth } from "@clerk/nextjs/server";
import { isVegetationIndexId } from "@/application/spectral/get-parcel-spectral-overlay";
import { createAccessResolver, getParcelSpectralZones } from "@/infrastructure/container";
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
  const url = new URL(request.url);
  const indexParam = url.searchParams.get("index") ?? "ndre";
  const acquiredAt = url.searchParams.get("acquiredAt") ?? undefined;
  const sourceId = url.searchParams.get("sourceId") ?? undefined;
  const refresh = url.searchParams.get("refresh") === "1";
  const meanRaw = url.searchParams.get("parcelMean");
  const parcelMean =
    meanRaw === null || meanRaw === ""
      ? undefined
      : meanRaw === "null"
        ? null
        : Number.parseFloat(meanRaw);

  if (!isVegetationIndexId(indexParam)) {
    return spectralErrorResponse({
      ok: false,
      reason: "unavailable",
      message: "Invalid vegetation index.",
    });
  }

  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);

  const result = await getParcelSpectralZones.execute({
    authority,
    parcelId,
    indexId: indexParam,
    acquiredAt,
    sourceId,
    refresh,
    parcelMean:
      parcelMean === undefined
        ? undefined
        : parcelMean === null || Number.isFinite(parcelMean)
          ? parcelMean
          : undefined,
  });

  if (!result.ok) {
    return spectralErrorResponse(result);
  }

  return spectralSuccessResponse(result.data);
}
