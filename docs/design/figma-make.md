# Figma Make — referencias

Catálogo de proyectos **Figma Make** (exploración UX/UI). Los archivos **design** canónicos viven en [figma.md](./figma.md).

**Flujo:** Make (iterar) → design file (consolidar) → código (`src/ui`, `/`, `/app`).

---

## Catálogo

| Nombre | Slice | fileKey | Estado | Edición | Código / design destino |
|--------|-------|---------|--------|---------|-------------------------|
| [Agro AI Landing Page](https://www.figma.com/make/2SYf8DOtblK84RC6oaNql7/Agro-AI-Landing-Page) | LP / waitlist (SEO-1) | `2SYf8DOtblK84RC6oaNql7` | **Congelado** — Version 2 = waitlist stg | **No editar** (solo lectura / version history) | `/` · `public/landing/` · frame `marketing/lp/full` en `oTT6PqFOAijVxYZb5wztEP` |
| **Agro AI Landing Page v3** (piloto) | LP-3 pre-piloto | `WFrwqsMxk9kTiPUSrOVlCU` | **En diseño** — export a design file pendiente | Copy design → `marketing/lp/pilot-v3` | `/` hero espectral en código |
| [Agro AI — Billing & Admin](https://www.figma.com/make/gQ0ta5hxC4FNd5EKaHY5nX/Agro-AI-%E2%80%94-Billing---Admin) | Billing-2 UX | `gQ0ta5hxC4FNd5EKaHY5nX` | **Portado** — código en `stg` (2026-08-27) | **Congelado** (solo lectura) | `/app/admin` · `/app/billing` · `/app/billing/cancel` |
| [Agro AI — Map & Spectral](https://www.figma.com/make/nusU2o1IuN6xOwgxEqgOv7/Agro-AI-Map---Spectral) | Spectral-2 UX | `nusU2o1IuN6xOwgxEqgOv7` | **Portado** — código en `stg` (2026-08-28) · **Make V4** alineado (2026-08-28) | **Congelado** (solo lectura) | `/app` · `spectral-panel` · `spectral-map-overlay` |

### Detalle por Make

#### Agro AI Landing Page (`2SYf8DOtblK84RC6oaNql7`)

- **Qué cubre:** LP pública, lista de espera, precios consultivos, “Pronto en producción”
- **Host:** `stg.geoagro.ai` / promote → `geoagro.ai`
- **Version history:** V1 landing completa · V2 waitlist + claims honestos
- **Tokens:** canvas `#F3F0E8`, panel `#FFFDF8`, chrome `#1C2A1F`, field `#4F6F52`, sky `#5B8FA8`, earth `#A67C52`

#### Agro AI — Billing & Admin (`gQ0ta5hxC4FNd5EKaHY5nX`)

- **Qué cubre:** `/app/admin`, `/app/billing`, modal cancelación
- **Estado de referencia:** Plan actual `weather_plus` (Intelligence Plus · $29/mes · Lima Coffee)
- **Contexto:** Clerk Billing sandbox · `stg.geoagro.ai`
- **Make v2 (2026-08-27):** shell Agro + placeholders Clerk (`PricingTable`, `SubscriptionDetailsButton`, `OrganizationProfile`); `weather_plus` / Weather Intelligence Plus; sin fechas hardcodeadas; entitlements ops override; cancel → portal Clerk
- **Pantallas objetivo (design file / código):**
  - `app/admin/subscription` — entitlements + allowlist + resumen plan
  - `app/billing/manage` — plan actual + tiers + legal footer
  - `app/billing/cancel-confirm` — modal trial / fin de período
- **Nota al portar a código:** suavizar claims inventados del Make (ML, SENASA, etc.) — alinear con `failure-lessons` y producto real

#### Agro AI — Map & Spectral (`nusU2o1IuN6xOwgxEqgOv7`)

- **Qué cubre:** overlay espectral en mapa + panel Espectral (Spectral-2 UX)
- **Pantallas:** `app/map-shell/spectral-overlay-active` · `spectral-index-picker` · `spectral-states`
- **Selector superior:** Overlay activo / Selector de índice / Estados espectrales (solo prototipo Make)
- **Version history:** V1 preview fix · V2 ajustes audit · V3 build errors · **V4 chrome claro + tabs underline + footer acciones** (alineado stg 2026-08-28)
- **Audit 2026-08-28:** leyenda NDRE (−1 estrés → 0.8+ saludable), sin badges por índice, gate Plus a nivel tab, demo Lima Coffee (sintética) / LC-01 / 2026-08-20
- **V4 verificado vs código:** chrome crema 2 filas (`rgba(255,253,248,0.94)`), selector parcela + chip NDRE en sub-fila, tabs compactos con subrayado, footer `Guardar datos` / `Editar geometría` / `Eliminar parcela`, hover solo color, mapa claro OSM-style
- **Deltas intencionales Make ↔ código:** dots de navegación entre pantallas prototipo (overlay / picker / estados); chip flotante en mapa además del sub-chrome; fecha escena `S2 · 20 ago` en sub-fila del Make (no en chrome de código)
- **Al portar a código:** mapa claro OpenFreeMap Liberty (no satélite oscuro del Make); chrome de dos filas + selector de parcela

---

## Reglas

| Regla | Motivo |
|-------|--------|
| **Un Make por slice** | No mezclar LP y billing en el mismo archivo |
| **LP Make congelado** | Ya portado a stg; cambios = nuevo Make o Copy design |
| **Copy design** antes de experimentos grandes | No perder versiones buenas |
| **Version history** | Rollback si un prompt rompe el layout |
| **Consolidar en design file** | Make no expone API de edición; design file sí (`use_figma`, handoff) |

---

## Añadir un Make nuevo

1. Crear en [figma.com/make](https://www.figma.com/make) o **Copy design** desde uno existente
2. Registrar fila en la tabla **Catálogo** (nombre, slice, fileKey, URL, estado, destino código)
3. Al cerrar slice: actualizar estado → **Congelado** o **Portado** y link al design file / PR

---

## LP-3: Make → design file → código (hero espectral)

Make **no reproduce** timeline MapLibre ni autoplay del producto. Flujo acordado:

| Paso | Quién | Qué |
|------|-------|-----|
| 1 | Julio | Iterar layout en Make `WFrwqsMxk9kTiPUSrOVlCU` (copy, secciones, tokens) |
| 2 | Julio | **Copy design** → pegar frame en design file `oTT6PqFOAijVxYZb5wztEP` · `marketing/lp/pilot-v3` |
| 3 | Julio | Compartir URL Figma con `node-id` del frame hero (desktop + mobile) |
| 4 | Agent | `get_design_context` (MCP) → ajustar CSS/copy en `src/app/` |
| 5 | Agent | Hero animado en **código**: `landing-spectral-hero.tsx` (MapLibre + panel Espectral + timeline) |

**Figma define:** grid, tipografía, espaciado, estados estáticos.  
**Código define:** mapa real, overlay NDRE, slider/play como `/app`.
