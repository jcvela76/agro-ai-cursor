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
  getParcelWeatherRainfall30d,
  getParcelWeatherRainfallCampaignComparison,
} from "@/infrastructure/container";

export const maxDuration = 60;

/** Default via AI Gateway (`provider/model`). Override with AI_GATEWAY_MODEL. */
const DEFAULT_GATEWAY_MODEL = "openai/gpt-4o-mini";

function isGatewayConfigured(): boolean {
  // Vercel runtime uses OIDC automatically; local/CI can use AI_GATEWAY_API_KEY or pulled OIDC token.
  return Boolean(
    process.env.AI_GATEWAY_API_KEY ||
      process.env.VERCEL_OIDC_TOKEN ||
      process.env.VERCEL,
  );
}

export async function GET() {
  const { userId, orgId } = await auth();
  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);
  return NextResponse.json({
    status: "OK",
    data: {
      plusEnabled: isPlusToolAllowed({ authority }),
      gatewayConfigured: isGatewayConfigured(),
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

  if (!isGatewayConfigured()) {
    return NextResponse.json(
      {
        status: "AGENT_UNAVAILABLE",
        message:
          "Agro Agent model is not configured (AI Gateway: set AI_GATEWAY_API_KEY or run on Vercel with OIDC).",
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
    rainfall30d: getParcelWeatherRainfall30d,
    rainfallCampaignComparison: getParcelWeatherRainfallCampaignComparison,
  });

  const model = process.env.AI_GATEWAY_MODEL ?? DEFAULT_GATEWAY_MODEL;

  const result = streamText({
    model,
    system: `${loadAgroAgentInstructions()}\n\nParcela activa (fija): ${parcelId}. Usa solo tools; no inventes valores.`,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(6),
  });

  return result.toUIMessageStreamResponse();
}
