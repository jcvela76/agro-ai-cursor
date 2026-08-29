import { auth } from "@clerk/nextjs/server";
import {
  createAccessResolver,
  getParcelSpectralHistory,
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
  const daysParam = new URL(request.url).searchParams.get("days");
  const days = daysParam ? Number.parseInt(daysParam, 10) : 90;

  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);

  const result = await getParcelSpectralHistory.execute({
    authority,
    parcelId,
    days: Number.isFinite(days) ? days : 90,
  });

  if (!result.ok) {
    return spectralErrorResponse(result);
  }

  return spectralSuccessResponse(result.data);
}
