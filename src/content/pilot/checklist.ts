/** Checklist + form kinds for pilot hub (shared UI / docs). */

export const PILOT_CHECKLIST = [
  { id: "map-parcel", label: "Mapa: ver o crear mi parcela" },
  { id: "weather", label: "Clima: observación y pronóstico con fuente" },
  { id: "spectral", label: "Espectral: índice + overlay de una escena" },
  { id: "agent", label: "Agente: 2–3 preguntas con citas" },
  { id: "field-or-profile", label: "Bitácora o perfil de cultivo" },
  { id: "weekly-feedback", label: "Enviar feedback semanal" },
] as const;

export const PILOT_FEEDBACK_KINDS = [
  { id: "onboarding", label: "Inicio (día 1)" },
  { id: "weekly", label: "Feedback semanal" },
  { id: "bug", label: "Reportar fallo" },
] as const;

export type PilotFeedbackKind = (typeof PILOT_FEEDBACK_KINDS)[number]["id"];

export const PILOT_BUG_FLOWS = [
  "mapa",
  "clima",
  "espectral",
  "agente",
  "informes",
  "bitacora",
  "admin",
  "otro",
] as const;
