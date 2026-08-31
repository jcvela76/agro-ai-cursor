import { agroAgentToolNames } from "@/agents/agro-agent/tools";
import { agentToolNoteForName } from "@/content/agent/tool-notes";
import {
  LANDING_DEMO_PARCEL_NAME,
  LANDING_DEMO_SCENES,
  formatLandingSceneDate,
  landingDemoIndexValue,
} from "@/content/landing/spectral-demo";

export interface LandingAgentScenario {
  id: string;
  chipLabel: string;
  userQuestion: string;
  toolNote: string;
  assistantMarkdown: string;
}

export const LANDING_AGENT_HOLD_MS = 5500;
export const LANDING_AGENT_CHAR_MS = 12;
export const LANDING_AGENT_USER_DELAY_MS = 400;
export const LANDING_AGENT_TOOL_DELAY_MS = 900;
export const LANDING_AGENT_SCENARIO_GAP_MS = 800;

function ndreTrendMarkdown(): string {
  const dates = ["2026-08-12", "2026-08-24", "2026-08-27"] as const;
  const rows = dates
    .map((date) => {
      const scene = LANDING_DEMO_SCENES.find((item) => item.acquisitionDate === date);
      if (!scene) return null;
      const ndre = landingDemoIndexValue(scene, "ndre");
      const evi = landingDemoIndexValue(scene, "evi");
      return `| ${formatLandingSceneDate(date)} | ${ndre.toFixed(2)} | ${evi.toFixed(2)} |`;
    })
    .filter((row): row is string => row != null);

  const latest = LANDING_DEMO_SCENES[LANDING_DEMO_SCENES.length - 1];
  const latestNdre = landingDemoIndexValue(latest, "ndre");

  return `En **${LANDING_DEMO_PARCEL_NAME}** el vigor varía entre escenas — conviene mirar la serie, no un solo valor.

| Escena | NDRE | EVI |
| --- | --- | --- |
${rows.join("\n")}

**Lectura:** picos de vigor alrededor de **0,49** (12 y 24 ago). La escena del **${formatLandingSceneDate(latest.acquisitionDate)}** muestra NDRE **${latestNdre.toFixed(2)}** — posible nubosidad o sombra en la adquisición; contrasta con la escena previa antes de concluir estrés.

**Fuente:** CDSE Sentinel-2 · media parcela · escenas del piloto.`;
}

const WEATHER_MARKDOWN = `**Temperatura a 2 m en parcela:** 17,4 °C (interpolado al polígono).
**Ciudad de referencia (~58 km):** 24 °C — no uses la estación urbana para decidir en campo.

| Variable | Parcela | Fuente |
| --- | --- | --- |
| Temp. 2 m | 17,4 °C | Open-Meteo / NASA POWER |
| Humedad rel. 2 m | 82 % | Observación diaria |
| Precip. hoy | 3,1 mm | Reanálisis + modelo |
| Viento 10 m (fcst) | 2,3 m/s NE | Pronóstico operacional |

**Alcance:** observación y pronóstico anclados al contorno de **${LANDING_DEMO_PARCEL_NAME}**; frescura según proveedor al consultar en la app.

_Valores ilustrativos para la demo del landing — en producto se citan fecha y ventana reales._`;

const LABORS_MARKDOWN = `Revisé pronóstico, lluvia reciente e índices en **${LANDING_DEMO_PARCEL_NAME}**.

**Señales que convergen**
- Pronóstico: varios días con precipitación moderada — ventana seca limitada.
- Mapa NDRE: zonas **por debajo del promedio de la parcela** sugieren revisar vigor en campo (no humedad de suelo).
- HR del aire ~80 % — considera viento y evaporación al planificar labores foliares.

**Orientación:** la evidencia sugiere **priorizar inspección** en sectores SO del polígono y reprogramar labores sensibles a viento/lluvia si el pronóstico se confirma. La decisión de momento y dosis queda con el agrónomo en visita.

<details>
<summary>Evidencia consultada</summary>

- Pronóstico · Open-Meteo (GFS/ICON)
- Índices de vegetación · CDSE Sentinel-2
- Mapa de zonas · NDRE

</details>`;

export const LANDING_AGENT_SCENARIOS: LandingAgentScenario[] = [
  {
    id: "ndre-trend",
    chipLabel: "¿Cómo viene el vigor?",
    userQuestion: "¿Cómo viene el vigor en las últimas escenas de NDRE?",
    toolNote: agentToolNoteForName(agroAgentToolNames.vegetationIndices),
    assistantMarkdown: ndreTrendMarkdown(),
  },
  {
    id: "weather-parcel",
    chipLabel: "¿Clima en parcela?",
    userQuestion: "¿Qué temperatura y humedad hay en la parcela hoy?",
    toolNote: agentToolNoteForName(agroAgentToolNames.observation),
    assistantMarkdown: WEATHER_MARKDOWN,
  },
  {
    id: "field-window",
    chipLabel: "¿Ventana para labores?",
    userQuestion: `¿Hay ventana para labores esta semana en ${LANDING_DEMO_PARCEL_NAME}?`,
    toolNote: agentToolNoteForName(agroAgentToolNames.forecast),
    assistantMarkdown: LABORS_MARKDOWN,
  },
];

export function findLandingAgentScenario(id: string): LandingAgentScenario | undefined {
  return LANDING_AGENT_SCENARIOS.find((scenario) => scenario.id === id);
}

export function nextLandingAgentScenarioId(currentId: string): string {
  const index = LANDING_AGENT_SCENARIOS.findIndex((scenario) => scenario.id === currentId);
  const next = index < 0 ? 0 : (index + 1) % LANDING_AGENT_SCENARIOS.length;
  return LANDING_AGENT_SCENARIOS[next].id;
}
