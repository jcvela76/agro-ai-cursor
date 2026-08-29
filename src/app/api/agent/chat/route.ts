import { auth } from "@clerk/nextjs/server";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";
import { createAgroAgentTools, isPlusToolAllowed } from "@/agents/agro-agent/tools";
import { buildAgroAgentSystemPrompt } from "@/agents/agro-agent/build-system-prompt";
import { emptyParcelAgronomicProfile } from "@/domain/parcel/agronomic-profile";
import {
  appendParcelAgentChat,
  authorizeParcelAgentChat,
  createAccessResolver,
  getParcelAgronomicProfile,
  getParcelRecentBriefings,
  getParcelWeatherEt0,
  getParcelWeatherForecast,
  getParcelWeatherGdd,
  getParcelWeatherLowRainDays,
  getParcelWeatherObservation,
  getParcelWeatherRainfall30d,
  getParcelWeatherRainfallCampaignComparison,
  getParcelVegetationIndices,
  getParcelSpectralZones,
  getParcelSpectralHistory,
  loadParcelAgentChat,
  updateParcelAgronomicProfile,
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

export async function GET(request: Request) {
  const { userId, orgId } = await auth();
  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);
  const plusEnabled = isPlusToolAllowed({ authority });

  const url = new URL(request.url);
  const parcelId = url.searchParams.get("parcelId")?.trim();

  if (!parcelId) {
    return NextResponse.json({
      status: "OK",
      data: {
        plusEnabled,
        gatewayConfigured: isGatewayConfigured(),
      },
    });
  }

  if (!plusEnabled || !authority) {
    return NextResponse.json({
      status: "OK",
      data: {
        plusEnabled: false,
        retentionDays: 0,
        messages: [],
        gatewayConfigured: isGatewayConfigured(),
      },
    });
  }

  const loaded = await loadParcelAgentChat.execute({ authority, parcelId });
  if (!loaded.ok) {
    return NextResponse.json(
      { status: "AGENT_UNAVAILABLE", message: loaded.message },
      { status: 403 },
    );
  }

  return NextResponse.json({
    status: "OK",
    data: {
      plusEnabled: loaded.plusEnabled,
      retentionDays: loaded.retentionDays,
      messages: loaded.messages.map((message) => ({
        id: message.id,
        role: message.role,
        parts: message.parts,
        createdAt: message.createdAt,
      })),
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

  // Authorize parcel before streaming.
  const gate = await authorizeParcelAgentChat.execute({ authority, parcelId });
  if (!gate.ok) {
    return NextResponse.json(
      { status: "AGENT_UNAVAILABLE", message: gate.message },
      { status: 403 },
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

  const lastUserMessage =
    [...messages].reverse().find((message) => message.role === "user") ??
    (body.message?.trim()
      ? ({
          id: `user-${Date.now()}`,
          role: "user" as const,
          parts: [{ type: "text" as const, text: body.message.trim() }],
        } satisfies UIMessage)
      : null);

  const tools = createAgroAgentTools({
    authority,
    parcelId,
    observation: getParcelWeatherObservation,
    forecast: getParcelWeatherForecast,
    rainfall30d: getParcelWeatherRainfall30d,
    rainfallCampaignComparison: getParcelWeatherRainfallCampaignComparison,
    lowRainDays: getParcelWeatherLowRainDays,
    gdd: getParcelWeatherGdd,
    et0: getParcelWeatherEt0,
    vegetationIndices: getParcelVegetationIndices,
    spectralZones: getParcelSpectralZones,
    spectralHistory: getParcelSpectralHistory,
    recentBriefings: getParcelRecentBriefings,
    getProfile: getParcelAgronomicProfile,
    updateProfile: updateParcelAgronomicProfile,
  });

  const model = process.env.AI_GATEWAY_MODEL ?? DEFAULT_GATEWAY_MODEL;

  const profileResult = await getParcelAgronomicProfile.execute({ authority, parcelId });
  const profile =
    profileResult.ok
      ? profileResult.data
      : emptyParcelAgronomicProfile(authority.orgId, parcelId);

  const result = streamText({
    model,
    system: buildAgroAgentSystemPrompt({ parcelId, profile }),
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: async ({ responseMessage, isAborted }) => {
      if (isAborted) {
        return;
      }
      try {
        await appendParcelAgentChat.execute({
          authority,
          parcelId,
          authorUserId: userId ?? null,
          turns: [
            ...(lastUserMessage
              ? [
                  {
                    id: lastUserMessage.id,
                    role: "user" as const,
                    parts: lastUserMessage.parts,
                    authorUserId: userId ?? null,
                  },
                ]
              : []),
            {
              id: responseMessage.id,
              role: "assistant" as const,
              parts: responseMessage.parts,
            },
          ],
        });
      } catch (error) {
        console.error("[agent/chat] failed to persist turn", error);
      }
    },
  });
}
