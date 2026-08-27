import { NextResponse } from "next/server";
import type { WeatherResult } from "@/domain/weather/types";

export function weatherErrorResponse(result: Extract<WeatherResult<unknown>, { ok: false }>) {
  return NextResponse.json(
    {
      status: "WEATHER_LIMITED",
      reason: result.reason,
      message: result.message,
    },
    { status: result.reason === "internal_error" ? 500 : 404 },
  );
}

export function weatherSuccessResponse<T>(data: T) {
  return NextResponse.json({ status: "OK", data });
}
