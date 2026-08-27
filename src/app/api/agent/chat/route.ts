import { openai } from "@ai-sdk/openai";
import { auth } from "@clerk/nextjs/server";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";
import { createAgroAgentTools, isPlusToolAllowed } from "@/agents/agro-agent/tools";
import { loadAgroAgentInstructions } from "@/agents/agro-agent/load-instructions";
import {
  createAccessResolver,
  getParcelWeatherForecast,
  getParcelWeatherObservation,
} from "@/infrastructure/container";

export const maxDuration = 60;

export async function GET() {
  const { userId, orgId } = await auth();
  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);
  return NextResponse.json({
    status: "OK",
    data: {
      plusEnabled: isPlusToolAllowed({ authority }),
    },
  });
}

export async function POST(request: Request) {
  const { userId, orgId } = await auth();
  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);

  if (!isPlusToolAllowed({ authority }) || !authority) {
    return NextResponse.json(
      {
        status: "AGENT_UNAVAILABLE",
        message: "Weather Intelligence Plus is required for Agro Agent chat.",
      },
      { status: 403 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        status: "AGENT_UNAVAILABLE",
        message: "Agro Agent model is not configured (OPENAI_API_KEY missing).",
      },
      { status: 503 },
    );
  }

  let body: { messages?: UIMessage[]; parcelId?: string; message?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { status: "BAD_REQUEST", message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parcelId = body.parcelId?.trim();
  if (!parcelId) {
    return NextResponse.json(
      { status: "BAD_REQUEST", message: "parcelId is required" },
      { status: 400 },
    );
  }

  const messages = body.messages ?? [];
  if (messages.length === 0 && !body.message?.trim()) {
    return NextResponse.json(
      { status: "BAD_REQUEST", message: "messages or message is required" },
      { status: 400 },
    );
  }

  const modelMessages =
    messages.length > 0
      ? await convertToModelMessages(messages)
      : [{ role: "user" as const, content: body.message!.trim() }];

  const tools = createAgroAgentTools({
    authority,
    parcelId,
    observation: getParcelWeatherObservation,
    forecast: getParcelWeatherForecast,
  });

  const result = streamText({
    model: openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini"),
    system: `${loadAgroAgentInstructions()}\n\nParcela activa (fija): ${parcelId}. Usa solo tools; no inventes valores.`,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(6),
  });

  return result.toUIMessageStreamResponse();
}
