import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

/** Smoke test: only outside Vercel Production. */
export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const stamp = new Date().toISOString();
  const error = new Error(`agro-ai sentry smoke test ${stamp}`);
  const eventId = Sentry.captureException(error);
  const flushed = await Sentry.flush(5000);
  const client = Sentry.getClient();

  return NextResponse.json({
    ok: true,
    message: error.message,
    eventId,
    flushed,
    clientDsn: Boolean(client?.getDsn()),
    envDsn: Boolean(
      process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
    ),
  });
}
