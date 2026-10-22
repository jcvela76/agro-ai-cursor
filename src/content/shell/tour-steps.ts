/** Copy for first-run shell orientation (not the pilot checklist). */

export const SHELL_TOUR_STORAGE_KEY = "agro-ai-shell-tour-v1";

export const SHELL_TOUR_STEPS = [
  {
    id: "map",
    title: "El mapa es tu workspace",
    body: "Todo el trabajo ocurre sobre el mapa a pantalla completa: zoom, panorámica y tu parcela como ancla geográfica.",
  },
  {
    id: "parcel",
    title: "Elegí o creá una parcela",
    body: "Arriba podés cambiar de parcela con el selector. Con «+ Nueva parcela» dibujás un polígono. En Free el clima usa esa parcela; Espectral y Agente requieren Enterprise o un piloto con Plus.",
  },
  {
    id: "panels",
    title: "Paneles a la derecha",
    body: "Con una parcela activa ves Clima. Espectral, Agente, Perfil, Campo, Trazabilidad y Revisión aparecen bloqueados en Free — tocá la pestaña para ver cómo avanzar a Enterprise o activar un piloto.",
  },
  {
    id: "pilot",
    title: "Programa piloto aparte",
    body: "Esta guía solo orienta la interfaz. El checklist de las primeras semanas, el formulario de inicio y el reporte de fallos están en Piloto — no se marcan desde aquí.",
    ctaHref: "/app/piloto",
    ctaLabel: "Ir al centro del piloto",
  },
] as const;

export type ShellTourStepId = (typeof SHELL_TOUR_STEPS)[number]["id"];
