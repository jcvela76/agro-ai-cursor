import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isPlusToolAllowed } from "@/agents/agro-agent/tools";
import { createAccessResolver } from "@/infrastructure/container";

export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);

  if (!isPlusToolAllowed({ authority })) {
    return NextResponse.json(
      {
        status: "AGENT_UNAVAILABLE",
        message: "Weather Intelligence Plus is required for Agro Agent chat.",
      },
      { status: 403 },
    );
  }

  const body = (await request.json()) as { message?: string };
  if (!body.message?.trim()) {
    return NextResponse.json({ status: "BAD_REQUEST", message: "message is required" }, { status: 400 });
  }

  return NextResponse.json({
    status: "SCAFFOLD",
    message: "Agro Agent scaffold ready. LLM wiring deferred until Plus gate tests pass.",
  });
}
