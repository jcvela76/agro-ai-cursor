import { auth } from "@clerk/nextjs/server";
import {
  getParcelWeatherObservation,
  createAccessResolver,
} from "@/infrastructure/container";
import {
  weatherErrorResponse,
  weatherSuccessResponse,
} from "@/infrastructure/http/weather-response";

export async function GET(
  _request: Request,
  context: { params: Promise<{ parcelId: string }> },
) {
  const { userId, orgId } = await auth();
  const { parcelId } = await context.params;

  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId);

  const result = await getParcelWeatherObservation.execute({ authority, parcelId });

  if (!result.ok) {
    return weatherErrorResponse(result);
  }

  return weatherSuccessResponse(result.data);
}
