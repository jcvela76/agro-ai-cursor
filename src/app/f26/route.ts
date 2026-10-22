import { NextResponse } from "next/server";

const signUpUrl = new URL("https://geoagro.ai/sign-up");
signUpUrl.search = new URLSearchParams({
  utm_source: "ficafe",
  utm_medium: "card",
  utm_campaign: "ficafe_cusco_202611",
}).toString();

export function GET() {
  const response = NextResponse.redirect(signUpUrl, 307);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
