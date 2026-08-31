import { agroAgentToolNames } from "@/agents/agro-agent/tools";

const TOOL_NOTE_BY_NAME: Record<string, string> = {
  [agroAgentToolNames.observation]: "Consultando observación climática…",
  [agroAgentToolNames.forecast]: "Consultando pronóstico operacional…",
  [agroAgentToolNames.rainfall30d]: "Consultando lluvia de los últimos 30 días…",
  [agroAgentToolNames.rainfallCampaignComparison]: "Comparando campaña lluviosa…",
  [agroAgentToolNames.lowRainDays]: "Buscando días con baja lluvia…",
  [agroAgentToolNames.gdd]: "Calculando grados-día acumulados…",
  [agroAgentToolNames.et0]: "Consultando ET0 orientativo…",
  [agroAgentToolNames.vegetationIndices]: "Consultando índices espectrales…",
  [agroAgentToolNames.spectralZones]: "Analizando zonas fishnet…",
  [agroAgentToolNames.spectralHistory]: "Comparando escenas históricas…",
  [agroAgentToolNames.recentBriefings]: "Consultando briefings recientes…",
  [agroAgentToolNames.getProfile]: "Consultando perfil agronómico…",
  [agroAgentToolNames.updateProfile]: "Actualizando perfil agronómico…",
  [agroAgentToolNames.getFieldNotes]: "Consultando bitácora de Campo…",
  [agroAgentToolNames.appendFieldNote]: "Guardando nota de Campo…",
};

const DEFAULT_TOOL_NOTE = "Consultando evidencia autorizada…";

export function agentToolNoteForName(toolName: string): string {
  return TOOL_NOTE_BY_NAME[toolName] ?? DEFAULT_TOOL_NOTE;
}

export function extractToolNamesFromParts(
  parts: ReadonlyArray<{ type: string; toolName?: string }>,
): string[] {
  const names: string[] = [];
  for (const part of parts) {
    if (part.type === "tool-invocation" && typeof part.toolName === "string") {
      names.push(part.toolName);
      continue;
    }
    if (part.type.startsWith("tool-")) {
      names.push(part.type.slice("tool-".length));
    }
  }
  return names;
}

/** Latest tool in the turn drives the status line shown in the chat bubble. */
export function agentToolNoteForParts(
  parts: ReadonlyArray<{ type: string; toolName?: string }>,
): string | null {
  const names = extractToolNamesFromParts(parts);
  if (names.length === 0) {
    return null;
  }
  return agentToolNoteForName(names[names.length - 1]!);
}
