# Figma Make — referencias

Catálogo de proyectos **Figma Make** (exploración UX/UI). Los archivos **design** canónicos viven en [figma.md](./figma.md).

**Flujo:** Make (iterar) → design file (consolidar) → código (`src/ui`, `/`, `/app`).

---

## Catálogo

| Nombre | Slice | fileKey | Estado | Edición | Código / design destino |
|--------|-------|---------|--------|---------|-------------------------|
| [Agro AI Landing Page](https://www.figma.com/make/2SYf8DOtblK84RC6oaNql7/Agro-AI-Landing-Page) | LP / waitlist (SEO-1) | `2SYf8DOtblK84RC6oaNql7` | **Congelado** — Version 2 = waitlist stg | **No editar** (solo lectura / version history) | `/` · `public/landing/` · frame `marketing/lp/full` en `oTT6PqFOAijVxYZb5wztEP` |
| [Agro AI — Billing & Admin](https://www.figma.com/make/gQ0ta5hxC4FNd5EKaHY5nX/Agro-AI-%E2%80%94-Billing---Admin) | Billing-2 UX | `gQ0ta5hxC4FNd5EKaHY5nX` | **Portado** — código en `stg` (2026-08-27) | **Congelado** (solo lectura) | `/app/admin` · `/app/billing` · `/app/billing/cancel` |
| [Agro AI — Map & Spectral](https://www.figma.com/make/nusU2o1IuN6xOwgxEqgOv7/Agro-AI-Map---Spectral) | Spectral-2 UX | `nusU2o1IuN6xOwgxEqgOv7` | **Aprobado** — V3 audit OK (2026-08-28) | **Congelado** (referencia Spectral-2) | `/app` map overlay · panel Espectral · `app/map-shell/spectral-*` |

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
- **Version history:** V1 preview fix · V2 ajustes audit · V3 build errors
- **Audit 2026-08-28:** leyenda NDRE (−1 estrés → 0.8+ saludable), sin badges por índice, gate Plus a nivel tab, demo Lima Coffee (sintética) / LC-01 / 2026-08-20
- **Al portar a código:** mapa claro (OpenFreeMap Liberty), no nav demo superior; evidencia desde API real

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
