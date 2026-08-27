# Figma — Agro AI

Archivo design canónico. UI-1 consolidó tokens + atoms + frames high-fi (2026-08-26).

## Links

| Recurso | URL |
|---------|-----|
| **Design file** | https://www.figma.com/design/oTT6PqFOAijVxYZb5wztEP |
| fileKey | `oTT6PqFOAijVxYZb5wztEP` |
| Página wireframes | `Weather wireframes` |
| Página UI-1 | `UI-1 Design System` |
| Figma Make | exploración → consolidar en `UI-1 Design System` |

## Tokens (variables `Agro UI-1`)

Campo Perú / clima — no purple-default:

- Canvas `#F3F0E8`, panel `#FFFDF8`, chrome `#1C2A1F`
- Accent field `#4F6F52`, sky `#5B8FA8`, earth `#A67C52`
- Status fresh / stale / error
- Spacing `space/1..7`, radius `sm|md|lg`

Código espejo: CSS variables en `src/app/globals.css` + atoms en `src/ui/`.

## Atoms

| Figma | Código |
|-------|--------|
| `Button/Primary` | `src/ui/button.tsx` |
| `Badge/Freshness` | `src/ui/badge.tsx` |
| `Panel` | `src/ui/panel.tsx` |
| `EvidenceRow` | `src/ui/evidence-row.tsx` |
| `StateBanner` | `src/ui/state-banner.tsx` |
| `MapChip` | `src/ui/map-chip.tsx` |

## Pantallas

| Frame | Spec | Estado |
|-------|------|--------|
| `marketing/lp/weather-gate` | LP pública + CTA Clerk | UI-1 high-fi |
| `app/map-shell/default` | Mapa fullscreen + chrome | UI-1 high-fi |
| `app/map-shell/draw` | Dibujar/guardar polígono | UI-2 high-fi |
| `weather/panel-observation` | WA-01 | UI-1 high-fi |
| `parcel/list/default` | WA-03, WA-05 | wireframe |
| `weather/observation/default` | WQ-01, WA-01 | wireframe |
| `weather/forecast/default` | WQ-03, WA-02 | wireframe |
| `weather/limitation-states/default` | WA-06 | wireframe |
| `agent/chat/default` | WA-07, Plus gate | wireframe (UI-5) |

## Workflow

1. **Make** — explorar layout
2. **Design file** — consolidar variables + frames en `UI-1 Design System`
3. **Code** — `src/ui` + `/` + `/app` (UI-1 hecho)
