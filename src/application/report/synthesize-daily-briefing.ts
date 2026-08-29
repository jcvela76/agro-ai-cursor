import { generateText } from "ai";
import type {
  DailyBriefingContextSnapshot,
  DailyBriefingSignal,
  DailyBriefingSuggestion,
} from "@/domain/report/daily-briefing";
import { buildDailyBriefingDeltas } from "@/domain/report/daily-briefing";

const DEFAULT_GATEWAY_MODEL = "openai/gpt-4o-mini";

function isGatewayConfigured(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY ||
      process.env.VERCEL_OIDC_TOKEN ||
      process.env.VERCEL,
  );
}

export function synthesizeDailyBriefingDeterministic(input: {
  signals: DailyBriefingSignal[];
  previous?: DailyBriefingContextSnapshot | null;
}): { summaryMarkdown: string; suggestions: DailyBriefingSuggestion[] } {
  const suggestions: DailyBriefingSuggestion[] = [];
  const rain30 = input.signals.find((s) => s.id === "rain_30d");
  const ndwi = input.signals.find((s) => s.id === "ndwi");
  const dryDays = input.signals.find((s) => s.id === "forecast_dry_days");

  if (typeof rain30?.value === "number" && rain30.value < 5) {
    suggestions.push({
      theme: "water",
      text: "Lluvia acumulada muy baja en 30 días; conviene validar humedad de suelo en campo.",
      confidence: "medium",
      evidenceRefs: ["rain_30d"],
    });
  }

  if (typeof ndwi?.value === "number" && ndwi.value < -0.3) {
    suggestions.push({
      theme: "vegetation",
      text: "NDWI bajo sugiere posible estrés hídrico en vegetación; no sustituye medición de suelo.",
      confidence: "medium",
      evidenceRefs: ["ndwi"],
    });
  }

  const ndwiSpread = input.signals.find((s) => s.id === "ndwi_zone_spread");
  const ndwiZoneLow = input.signals.find((s) => s.id === "ndwi_zone_low");
  if (
    typeof ndwiSpread?.value === "number" &&
    ndwiSpread.value >= 0.05 &&
    typeof ndwiZoneLow?.value === "number"
  ) {
    suggestions.push({
      theme: "vegetation",
      text: `Heterogeneidad NDWI dentro de la parcela (Δ ${ndwiSpread.value.toFixed(2)}); ${ndwiZoneLow.label} = ${ndwiZoneLow.value.toFixed(2)}. Conviene priorizar inspección en esa subárea; tiers relativos, no umbrales absolutos.`,
      confidence: "medium",
      evidenceRefs: ["ndwi_zone_spread", "ndwi_zone_low"],
    });
  }

  if (typeof dryDays?.value === "number" && dryDays.value >= 5) {
    suggestions.push({
      theme: "weather",
      text: "Pronóstico seco en el horizonte disponible; planificar labores al aire libre con cautela.",
      confidence: "low",
      evidenceRefs: ["forecast_dry_days"],
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      theme: "operations",
      text: "Señales sin cambios críticos; mantener monitoreo rutinario de parcela.",
      confidence: "low",
      evidenceRefs: input.signals.map((s) => s.id).slice(0, 3),
    });
  }

  const deltas = buildDailyBriefingDeltas(input.signals, input.previous?.signals);
  const deltaLines =
    deltas.length > 0
      ? deltas
          .slice(0, 5)
          .map((d) => `- ${d.label}: ${d.previousValue} → ${d.currentValue}`)
          .join("\n")
      : "- Primer briefing diario para esta parcela (sin delta previo).";

  const summaryMarkdown = `## Resumen del día\n${suggestions.map((s) => `- ${s.text}`).join("\n")}\n\n## Delta vs ayer\n${deltaLines}`;

  return { summaryMarkdown, suggestions };
}

export async function synthesizeDailyBriefingNarrative(input: {
  parcelName: string;
  reportDay: string;
  signals: DailyBriefingSignal[];
  previous?: DailyBriefingContextSnapshot | null;
}): Promise<{ summaryMarkdown: string; suggestions: DailyBriefingSuggestion[] }> {
  if (!isGatewayConfigured()) {
    return synthesizeDailyBriefingDeterministic(input);
  }

  const deltas = buildDailyBriefingDeltas(input.signals, input.previous?.signals);
  const prompt = `Eres el asistente agronómico de Agro AI (Perú). Genera un briefing diario en español para la parcela "${input.parcelName}" (${input.reportDay}).

Señales actuales (JSON):
${JSON.stringify(input.signals, null, 2)}

Delta vs briefing anterior:
${deltas.length ? JSON.stringify(deltas, null, 2) : "Sin briefing previo."}

Reglas WQ-18: orientación condicional con evidencia; prohibido ordenar riego/dosis; decisión final del agrónomo.

Responde SOLO markdown con:
## Resumen del día
(3-5 viñetas)
## Delta vs ayer
(2-4 viñetas o "Sin briefing previo")
## Sugerencias
(3 viñetas numeradas, lenguaje condicional)`;

  try {
    const { text } = await generateText({
      model: process.env.AI_GATEWAY_MODEL ?? DEFAULT_GATEWAY_MODEL,
      prompt,
    });

    const deterministic = synthesizeDailyBriefingDeterministic(input);
    return {
      summaryMarkdown: text.trim() || deterministic.summaryMarkdown,
      suggestions: deterministic.suggestions,
    };
  } catch {
    return synthesizeDailyBriefingDeterministic(input);
  }
}
