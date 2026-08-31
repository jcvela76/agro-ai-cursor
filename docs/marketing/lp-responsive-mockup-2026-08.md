# LP responsive mockup — mobile & tablet (LP-5)

**Fecha:** 2026-08-30 (LP-5b stacked hero)  
**Rama:** `stg`  
**Prerequisito:** audit UI/UX (hero rails, sheet, breakpoint split 768 vs 1024)  
**Objetivo:** coherencia visual y de interacción en **320–767px** (mobile) y **768–1023px** (tablet) antes de pulir desktop.

---

## 1. Sistema de breakpoints unificado

| Token | Rango | Uso |
|-------|-------|-----|
| `mobile` | &lt;768px | Stack, sheet en hero, nav hamburger |
| `tablet` | 768–1023px | Hero overlay (copy TL + panel BR), secciones 2-col |
| `desktop` | ≥1024px | Hero 3-rail grid, secciones 2–3 col |

**Regla:** secciones bajo el fold usan **768px**; hero usa **1024px** para 3 columnas — mantener, pero documentar en CSS (`/* page tablet */` vs `/* hero desktop rail */`).

---

## 2. Mobile mockup (320–767px)

### 2.1 Header

```
┌─────────────────────────────────────┐
│ Agro AI                    [≡]      │  ← 4rem fijo, glass claro
└─────────────────────────────────────┘
  (drawer abierto: fondo oscuro #1c2a1f, links crema)
```

- Drawer **mismo fondo que header** cuando abierto (no panel claro con texto claro).
- Body scroll lock mientras menú abierto.

### 2.2 Hero — layout objetivo (LP-5b: dos bloques)

```
┌─────────────────────────────────────┐
│ header                              │
│ ┌─ copy sólido (#fffdf8) ────────┐  │  ← bloque 1: sin mapa detrás
│ │ eyebrow · H1 · support         │  │
│ │ CTAs · trust · waitlist COL    │  │
│ └────────────────────────────────┘  │
│ ┌─ map stage (~40svh) ───────────┐  │  ← bloque 2
│ │     [ Escena · CDSE ]          │  │
│ │            MAPA                │  │
│ └────────────────────────────────┘  │
│ ┌─ panel Espectral/Agente ───────┐  │
│ │ tabs · índices / agent demo    │  │
│ └────────────────────────────────┘  │
└─────────────────────────────────────┘
│ evidence bar                        │
```

**Cambios vs overlay (LP-5a)**

| Issue | Fix LP-5b |
|-------|-----------|
| Copy glass sobre mapa → polígono tapa texto | **Bloque 1** copy con fondo sólido, fuera del mapa |
| Sheet/panel flotando sobre mapa | Panel **debajo** del map stage en flujo normal |
| Hero 100svh fuerza solapamiento | `min-height: 100svh` solo ≥1024px |

### 2.3 Hero — tab Agente (mobile)

- Sheet altura `min(52svh, 26rem)` en xs; `min(55svh, 28rem)` en sm+.
- Mensajes agente: `max-height: min(14rem, 32vh)` — chips en 2 filas max.
- Autoplay: **pausa al primer touch** en panel (no solo hover).
- Spectral: índices en scroll horizontal si &lt;360px (fase 2 opcional).

### 2.4 Secciones bajo el fold (mobile)

| Módulo | Mockup |
|--------|--------|
| **Evidence bar** | Scroll horizontal + fade derecho (hint) |
| **Problema** | 1 col; imagen full width; pain cards 1 col &lt;640, 2 col ≥640 |
| **Clima** | Pilares stack; sample bar wrap 2×2 métricas |
| **Agente `#agente`** | Demo **arriba**, copy abajo (column-reverse OK); demo `max-height: 70vh` |
| **Productos** | Stack; imagen café full bleed en card |
| **Precios** | Stack; highlight card primero visualmente (orden CSS opcional) |
| **Closing** | 1 col; waitlist full width |
| **Footer** | Centrado; links wrap |

**Padding vertical secciones:** `4rem` mobile → `6rem` tablet → `9rem` desktop (mockup: menos aire en móvil).

---

## 3. Tablet mockup (768–1023px)

### 3.1 Hero — stacked tier (LP-5b)

Mismo patrón que mobile: **copy arriba → map stage → panel abajo**. Sin overlay glass sobre mapa hasta ≥1024px.

```
┌──────────────────────────────────────────────────┐
│ header                                           │
│ ┌──────── copy sólido (max ~40rem) ────────────┐ │
│ │ H1 · CTAs · waitlist                         │ │
│ └──────────────────────────────────────────────┘ │
│ ┌──────── map stage (~46svh) ──────────────────┐ │
│ │              [chip] · MAPA                   │ │
│ └──────────────────────────────────────────────┘ │
│ ┌──────── panel Espectral/Agente ──────────────┐ │
│ └──────────────────────────────────────────────┘ │
│ evidence bar                                     │
└──────────────────────────────────────────────────┘
```

- `fitBounds` en stacked: padding simétrico (sin medir rails).
- Desktop ≥1024px conserva grid 3-rail con glass overlay.

### 3.2 Secciones tablet

| Módulo | Layout |
|--------|--------|
| Intro blocks (problem, weather, agent) | 2 col título | lead |
| Pilares / productos / precios | 3 col donde ya existe |
| Agent grid | 2 col: copy 0.9fr | demo 1.1fr (no reverse) |
| Closing | 2 col |

---

## 4. Componentes compartidos

### Glass card (copy, agent demo, popup)

- `agent-chat-glass.module.css` — ya unificado.
- Mobile: border-radius `var(--radius-lg)`; padding `1.25rem`.

### Bottom sheet (hero only)

- No drag handle en v1; tabs siempre visibles.
- v2 opcional: peek 40% + expand.

---

## 5. Plan de implementación

| Slice | Scope | Prioridad |
|-------|--------|-----------|
| **LP-5a** | Hero mobile: safe-area, copy scroll, waitlist hero, header drawer | hecho |
| **LP-5b** | Hero mobile/tablet: **dos bloques** (copy → map → panel); sin overlay &lt;1024px | hecho |
| **LP-5c** | Secciones: padding mobile, evidence hint, agent `#agente` heights, touch agent | P1 |
| **LP-5d** | Spectral panel density mobile (chips scroll, zones wrap) | P2 |

---

## 6. Criterios de aceptación (QA manual)

### Mobile (375×812)

- [ ] Scroll Problem: **no** sheet espectral encima del contenido.
- [ ] Copy hero scrollable sin quedar bajo sheet.
- [ ] Menú hamburger legible (contraste AA).
- [ ] Tab Agente en hero usable; pausa con touch.
- [ ] Waitlist hero en columna.

### Tablet (768×1024)

- [ ] Parcela centrada entre copy y panel sin clip.
- [ ] Copy y panel no se superponen verticalmente.
- [ ] Sección agente en 2 columnas.

### Regression desktop (1280+)

- [ ] Hero 3-rail sin cambios visuales relevantes.

---

## 7. Fuera de scope LP-5

- Rediseño copy Make LP-3.
- Tab Clima interactivo en hero.
- Sheet collapse/expand gesture.
- Typewriter stream en agente producto.
