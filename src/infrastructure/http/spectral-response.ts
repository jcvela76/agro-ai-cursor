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

export function spectralSuccessResponse<T>(data: T) {
  return NextResponse.json({ status: "OK", data });
}
