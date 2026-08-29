import { NextResponse } from "next/server";
import type { SpectralResult } from "@/domain/spectral/types";

export function spectralErrorResponse(result: Extract<SpectralResult<unknown>, { ok: false }>) {
  return NextResponse.json(
    {
      status: "SPECTRAL_LIMITED",
      reason: result.reason,
      message: result.message,
    },
    { status: result.reason === "internal_error" ? 500 : 404 },
  );
}

export function spectralSuccessResponse<T>(data: T, options?: { cacheSeconds?: number | null }) {
  const cacheSeconds = options?.cacheSeconds;
  const cacheControl =
    cacheSeconds == null || cacheSeconds <= 0
      ? "private, no-store"
      : `private, max-age=${cacheSeconds}`;
  return NextResponse.json(
    { status: "OK", data },
    {
      headers: {
        "Cache-Control": cacheControl,
      },
    },
  );
}
