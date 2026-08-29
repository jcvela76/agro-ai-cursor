import { auth } from "@clerk/nextjs/server";
import {
  createAccessResolver,
  getParcelVegetationIndices,
} from "@/infrastructure/container";
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
  const sourceParam = new URL(request.url).searchParams.get("source");
  const source =
    sourceParam === "cache" || sourceParam === "auto" || sourceParam === "live"
      ? sourceParam
      : "live";

  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);

  const result = await getParcelVegetationIndices.execute({
    authority,
    parcelId,
    source,
  });

  if (!result.ok) {
    return spectralErrorResponse(result);
  }

  return spectralSuccessResponse(result.data);
}
