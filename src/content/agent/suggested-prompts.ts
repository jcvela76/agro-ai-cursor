export interface AgentSuggestedPrompt {
  id: string;
  label: string;
  prompt: string;
}

/** Starter prompts shown in the Agro Agent composer (product + landing demo). */
export const AGENT_SUGGESTED_PROMPTS: AgentSuggestedPrompt[] = [
  {
    id: "temperature",
    label: "¿Temperatura hoy?",
    prompt: "¿Cuál es la última temperatura disponible en la parcela?",
  },
  {
    id: "ndre-trend",
    label: "¿Cómo viene el vigor?",
    prompt: "¿Cómo viene el vigor en las últimas escenas de NDRE?",
  },
  {
    id: "field-window",
    label: "¿Ventana para labores?",
    prompt: "¿Hay ventana para labores esta semana?",
  },
];

export function findAgentSuggestedPrompt(id: string): AgentSuggestedPrompt | undefined {
  return AGENT_SUGGESTED_PROMPTS.find((item) => item.id === id);
}
