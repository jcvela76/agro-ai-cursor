import {
  buildParcelProfileContextBlock,
  emptyParcelAgronomicProfile,
  type ParcelAgronomicProfile,
} from "@/domain/parcel/agronomic-profile";
import { loadAgroAgentInstructions } from "@/agents/agro-agent/load-instructions";

export function buildAgroAgentSystemPrompt(input: {
  parcelId: string;
  profile: ParcelAgronomicProfile;
}): string {
  return [
    loadAgroAgentInstructions(),
    "",
    `Parcela activa (fija): ${input.parcelId}. Usa solo tools; no inventes valores. Formato: resumen breve visible + tabla completa dentro de <details><summary>Ver evidencia consultada</summary>. Si preguntan riego/humedad: playbook hídrico completo antes de responder.`,
    "",
    buildParcelProfileContextBlock(input.profile),
  ].join("\n");
}

export { emptyParcelAgronomicProfile };
