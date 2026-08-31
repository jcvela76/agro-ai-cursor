import type { CropKey } from "@/domain/parcel/crop-catalog";

export interface AgentSuggestedPrompt {
  id: string;
  label: string;
  prompt: string;
}

const TEMPERATURE: AgentSuggestedPrompt = {
  id: "temperature",
  label: "¿Temperatura hoy?",
  prompt: "¿Cuál es la última temperatura disponible en la parcela?",
};

const NDRE_TREND: AgentSuggestedPrompt = {
  id: "ndre-trend",
  label: "¿Cómo viene el vigor?",
  prompt: "¿Cómo viene el vigor en las últimas escenas de NDRE?",
};

const FIELD_WINDOW: AgentSuggestedPrompt = {
  id: "field-window",
  label: "¿Ventana para labores?",
  prompt: "¿Hay ventana para labores esta semana?",
};

const RAIN_CAMPAIGN: AgentSuggestedPrompt = {
  id: "rain-campaign",
  label: "¿Lluvia de campaña?",
  prompt: "¿Cómo va la lluvia de campaña comparada con el año anterior?",
};

const GDD: AgentSuggestedPrompt = {
  id: "gdd",
  label: "¿Grados-día?",
  prompt: "¿Cuántos grados-día acumulados hay desde la siembra?",
};

const IRRIGATION: AgentSuggestedPrompt = {
  id: "irrigation-hint",
  label: "¿Señales de riego?",
  prompt:
    "Según clima y NDMI/NDWI, ¿qué señales hay para revisar riego en campo? (sin prescripción)",
};

const SPRAY_WINDOW: AgentSuggestedPrompt = {
  id: "spray-window",
  label: "¿Ventana foliar?",
  prompt: "¿Hay ventana para labores foliares según viento y humedad previstos?",
};

const CROP_PROMPTS: Record<CropKey, AgentSuggestedPrompt[]> = {
  cafe: [TEMPERATURE, NDRE_TREND, RAIN_CAMPAIGN],
  uva: [TEMPERATURE, NDRE_TREND, SPRAY_WINDOW],
  esparrago: [IRRIGATION, NDRE_TREND, FIELD_WINDOW],
  palto: [IRRIGATION, NDRE_TREND, RAIN_CAMPAIGN],
  maiz: [GDD, RAIN_CAMPAIGN, NDRE_TREND],
  papa: [GDD, NDRE_TREND, FIELD_WINDOW],
  citricos: [TEMPERATURE, NDRE_TREND, SPRAY_WINDOW],
  otro: [TEMPERATURE, NDRE_TREND, FIELD_WINDOW],
};

/** Starter prompts shown in the Agro Agent composer (product + landing demo). */
export const AGENT_SUGGESTED_PROMPTS: AgentSuggestedPrompt[] = CROP_PROMPTS.otro;

export function buildAgentSuggestedPrompts(context?: {
  cropKey?: CropKey | null;
}): AgentSuggestedPrompt[] {
  const cropKey = context?.cropKey ?? null;
  if (cropKey && cropKey in CROP_PROMPTS) {
    return CROP_PROMPTS[cropKey];
  }
  return AGENT_SUGGESTED_PROMPTS;
}

export function findAgentSuggestedPrompt(id: string): AgentSuggestedPrompt | undefined {
  for (const prompts of Object.values(CROP_PROMPTS)) {
    const match = prompts.find((item) => item.id === id);
    if (match) return match;
  }
  return undefined;
}
