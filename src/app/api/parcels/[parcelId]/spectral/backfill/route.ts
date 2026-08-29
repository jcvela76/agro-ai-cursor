import { auth } from "@clerk/nextjs/server";
import { createAccessResolver, backfillParcelSpectralHistory } from "@/infrastructure/container";
import {
  spectralErrorResponse,
  spectralSuccessResponse,
} from "@/infrastructure/http/spectral-response";

export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ parcelId: string }> },
) {
  const { userId, orgId } = await auth();
  const { parcelId } = await context.params;

  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);

  const url = new URL(request.url);
  const daysParam = url.searchParams.get("days");
  const days = daysParam ? Number.parseInt(daysParam, 10) : undefined;

  const result = await backfillParcelSpectralHistory.execute({
    authority,
    parcelId,
    days: Number.isFinite(days) ? days : undefined,
  });

  if (!result.ok) {
    return spectralErrorResponse(result);
  }

  return spectralSuccessResponse(result.data);
}
