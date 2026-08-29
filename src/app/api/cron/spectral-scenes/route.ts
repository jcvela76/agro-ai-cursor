import { NextResponse } from "next/server";
import { runSpectralScenePolling } from "@/infrastructure/container";

export const maxDuration = 300;

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) {
    return true;
  }
  const vercelCron = request.headers.get("x-vercel-cron-authorization");
  if (vercelCron === `Bearer ${secret}`) {
    return true;
  }
  return false;
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}

async function handleCron(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json(
      { status: "CRON_UNAUTHORIZED", message: "Cron secret inválido o ausente." },
      { status: 401 },
    );
  }

  try {
    const result = await runSpectralScenePolling.execute();
    return NextResponse.json({ status: "OK", data: result });
  } catch (error) {
    console.error("spectral scene polling cron failed", error);
    return NextResponse.json(
      {
        status: "CRON_FAILED",
        message: error instanceof Error ? error.message : "Cron failed",
      },
      { status: 500 },
    );
  }
}
