# LP audit + brief Make LP-3 (pre-piloto)

**Fecha:** 2026-08-29  
**Rama:** `stg`  
**Objetivo:** alinear `geoagro.ai` con producto real antes del piloto con usuarios.  
**Make actual (congelado):** [Agro AI Landing Page](https://www.figma.com/make/2SYf8DOtblK84RC6oaNql7) · fileKey `2SYf8DOtblK84RC6oaNql7`  
**Make nuevo:** **LP-3** — Copy design desde V2; no editar el congelado.  
**Design file destino:** `oTT6PqFOAijVxYZb5wztEP` → frame `marketing/lp/pilot-v3`

---

## 1. Matriz copy (LP actual → verdad producto)

Leyenda: **OK** · **SUAVIZAR** · **QUITAR** · **AÑADIR** · **MOVER**

### Hero + header

| Ubicación | Copy actual | Estado | Acción / copy propuesto |
|-----------|-------------|--------|-------------------------|
| `SITE_TITLE` / meta | «…Lista de espera» | SUAVIZAR | «Clima e índices por parcela en Perú · Piloto» |
| H1 | «El clima y el vigor de tu parcela — con fuente y evidencia.» | OK | **Agente primero** en sub; fuente = confianza, no producto |
| Hero support | Open-Meteo · NASA POWER | AÑADIR | Línea 1: agente agronómico · Línea 2: fuentes como respaldo |
| CTA primario | Lista de espera | OK | Coexistir: «Solicitar piloto» + waitlist |
| Header nav | Plataforma / Productos / Precios | AÑADIR | Nav: «Espectral» o «Inteligencia» ancla `#inteligencia` |
| Evidence bar | GFS/ICON, ERA5-Land | SUAVIZAR | Separar «fuentes clima» vs «Sentinel-2 L2A (Plus)» |

### El problema

| Copy | Estado | Acción |
|------|--------|--------|
| Estación a 50–80 km, 8 °C / 200 mm | OK | Mantener (dato ilustrativo, no claim legal) |
| «Agro AI ancla al contorno exacto» | OK | Mantener |
| Compare overlay ciudad vs parcela | OK | Actualizar copy demo: quitar `#4812` ficticio → «parcela demo» |
| — | AÑADIR | Bloque dolor #2: «Un índice de hoy no muestra tendencia» (sparkline/historial) |
| — | AÑADIR | Bloque dolor #3: «Decisiones sin bitácora ni fuente citada» |

### Base climática (pilares)

| Copy | Estado | Acción |
|------|--------|--------|
| T, HR, precip, viento en pillar observado | OK | Alinear con ADR-052/056 (2 m obs, 10 m forecast) |
| «Historial desde 1940 (ERA5-Land)» | SUAVIZAR | «Contexto histórico vía reanálisis» — no prometer UI 1940 en app |
| «Ensamble en desarrollo» | OK | Mantener |
| Sample metrics (18.4 °C, 82 % HR…) | OK | Etiqueta «ilustrativo» ya existe — bien |
| — | AÑADIR | Mencionar informe hídrico / ET0 orientativo (Plus, no dosis) |

### Productos (tarjetas)

#### Intelligence Plus

| Feature LP | Inventario | Acción |
|------------|------------|--------|
| Alertas configurables por cultivo | WQ-19 refuse alertas oficiales | **QUITAR** o → «Briefing diario con señales (Plus)» |
| ETo y balance hídrico | ET0 tool + informe hídrico hecho | **OK** — «ET0 orientativo e informe hídrico» |
| Mapa parcelas + historial climático | hecho | OK |
| Export API/CSV roadmap | planificado | OK como roadmap |
| — | AÑADIR | 8 índices NDRE/EVI/… + overlay PNG CDSE |
| — | AÑADIR | Zonas fishnet + historial escenas + timeline |
| — | AÑADIR | Agente con tools y citas a NASA POWER / CDSE |
| — | AÑADIR | Bitácora Campo + foto opcional |

#### Trazabilidad

| Feature LP | Estado | Acción |
|------------|--------|--------|
| Disclaimer EUDR no certificación | OK | Mantener prominente |
| Cadena custodia piloto | OK | Mantener |
| Exportables EUDR en desarrollo | OK | Mantener |

#### Revisión Agronómica

| Feature LP | Estado | Acción |
|------------|--------|--------|
| Bitácora append-only agrónomo | **SUAVIZAR** | Separar: **Campo** = bitácora; **Revisión** = decisiones formales `agronomic_review` |
| «Sin firma criptográfica» | OK | Mantener |
| Plans Operations+ | SUAVIZAR | Verificar nombres plan Clerk vs «Operations» en LP |

### Precios

| Copy | Estado | Acción |
|------|--------|--------|
| No vinculante / sin checkout público | OK | Mantener |
| Básico: alertas por correo | **QUITAR** | Inventario: overclaim; briefing email es Plus |
| Profesional: piloto sin costo | OK | Mantener |
| Hasta 5 miembros weather_plus | OK | Verificar límite seats actual Clerk |

### Roadmap (closing)

| Ítem | `done` LP | Verdad | Acción |
|------|-----------|--------|--------|
| Open-Meteo + NASA POWER | ✓ | hecho | OK |
| Motor de alertas agronómicas | ✓ | WQ-19 refuse | **QUITAR** o marcar ✗ |
| Piloto productores Junín | ✓ | no verificado en código | **SUAVIZAR** → «Piloto en curso» sin Junín específico salvo confirmado |
| Trazabilidad piloto workspace | ✓ | hecho | OK |
| Export EUDR + API v1 | ✗ | planificado | OK |
| Lanzamiento comercial | ✗ | diferido billing | OK |

### Closing

| Copy | Acción |
|------|--------|
| «Pronto en producción» | **SUAVIZAR** → «Piloto abierto · producción comercial después» |
| Waitlist sin spam | OK |

---

## 2. Visual / tipografía / contraste (auditoría rápida)

| Token / uso | Valor | Nota |
|-------------|-------|------|
| Canvas | `#F3F0E8` | OK — UI-1 |
| Texto body | `#1C2A1F` | OK sobre canvas |
| Nav links | `rgba(28,42,31,0.72)` | OK — LP-3a |
| Eyebrow | `#4F6F52` | OK — accent sólido |
| Display | Fraunces | H1/H2 only |
| Body | Source Sans 3 | OK |
| CTAs | `.btnPrimary` field green | Verificar contraste texto blanco/crema |
| Hero image | `hero.jpg` | Reemplazar o complementar con screenshot mapa+NDRE |
| Problem compare | overlay cards | Mobile: verificar legibilidad en 375px |

**Assets a capturar desde `stg` (Playwright):**

1. Mapa + overlay NDRE + badge fecha  
2. Panel Espectral: timeline + sparkline  
3. Tabla comparar A/B  
4. Agente citando fuente  
5. Clima obs + forecast con HR/viento  

Guardar en `public/landing/` como `spectral-map.webp`, etc.

---

## 3. SEO — actual vs propuesto

| Campo | Actual | Propuesto (piloto) |
|-------|--------|---------------------|
| `SITE_TITLE` | clima exacto… Lista de espera | `Agro AI — clima e índices Sentinel por parcela en Perú` |
| `SITE_DESCRIPTION` | lista de espera, Open-Meteo NASA | Mencionar Plus: NDRE, zonas, agente, evidencia; piloto sin costo |
| `keywords` | lista de espera | + `NDRE`, `índices vegetación`, `Sentinel-2`, `agronomía digital`, `geoagro` |
| JSON-LD `SoftwareApplication` | offer precio 0 waitlist | Añadir `featureList` alineado a secciones visibles |
| OG image | genérica | Refresh con mapa+overlay (post LP-3b) |
| Indexación | prod only | Sin cambio política `docs/ops/seo.md` |

**Post-deploy prod:** re-submit sitemap GSC; Lighthouse `/` (LCP hero).

---

## 4. Brief Figma Make **LP-3** (pegar en Make)

```
Proyecto: Agro AI Landing Page v3 (piloto 2026)
Base: Copy design desde Make 2SYf8DOtblK84RC6oaNql7 V2 (waitlist)
NO inventar: ML, SENASA, certificación EUDR, alertas automáticas por SMS

Tokens (mantener):
- Canvas #F3F0E8, panel #FFFDF8, chrome #1C2A1F
- Accent field #4F6F52, sky #5B8FA8, earth #A67C52
- Tipografía: Fraunces títulos, Source Sans cuerpo

Referencias visuales:
- Make Map & Spectral nusU2o1IuN6xOwgxEqgOv7 V4 (chrome claro, tabs, overlay NDRE)
- Screenshots reales stg cuando existan

Secciones (desktop + mobile):

1. HEADER fijo: logo Agro AI · nav [Plataforma, Inteligencia, Productos, Precios] · Entrar · CTA «Piloto / Lista de espera»

2. HERO split:
   - Izq: eyebrow geoagro.ai · Perú
   - H1: «El clima y el vigor de tu parcela — con fuente y evidencia.»
   - Sub (agente primero): agente agronómico que une clima, Sentinel y Campo para decidir; fuentes en segunda línea
   - CTAs: primario waitlist · secundario scroll
   - Der: mockup browser con mapa claro + overlay verde NDRE + chip «Escena · fuente CDSE»

3. PROBLEMA (2 columnas):
   - Copy estación lejana (mantener)
   - Card comparativa ciudad 24°C vs parcela 17°C
   - Nuevo párrafo: tendencia satelital en el tiempo

4. INTELIGENCIA (nueva sección #inteligencia):
   - 3 cards: Clima (obs+forecast HR/viento) · Espectral (8 índices, zonas, historial, timeline) · Agente (chat con citas)
   - Cada card: icono + 3 bullets + badge «Plus» donde aplique

5. PRODUCTOS: 3 tarjetas (Plus, Trazabilidad café, Revisión) — bullets del audit §1

6. PRECIOS: 3 tiers — aviso legal no vinculante; destacar Profesional piloto sin costo

7. CIERRE oscuro: waitlist + roadmap honesto (sin «motor alertas»)

8. FOOTER: legal links · © RAW CODE operador si counsel OK en /legal

Estados: default + mobile 375px
Export: frames para marketing/lp/pilot-v3 en design file oTT6PqFOAijVxYZb5wztEP
```

---

## 5. Slices de implementación (orden)

| # | Slice | Depende de |
|---|-------|------------|
| LP-3a | Contraste + tokens CSS (`navLink`, eyebrow) | — |
| LP-3b | Hero + assets + header CTA copy | Make hero aprobado |
| LP-3c | Problema ampliado + sample metrics HR/viento | — |
| LP-3d | Sección `#inteligencia` (nueva) | Screenshots stg |
| LP-3e | Productos + roadmap + closing copy | Audit §1 |
| LP-SEO-1 | `site.ts`, JSON-LD, keywords | LP-3e copy final |
| LP-SEO-2 | OG image refresh | LP-3b assets |

Cada slice cerrado: actualizar filas LP en `docs/feature-inventory.md` + commit + push.

---

## 6. Siguiente paso inmediato

- [x] Agent: **LP-3a** contraste CSS (`navLink`, leads, evidence bar, productos)
- [x] Agent: **LP-3c** problema ampliado + métricas obs/fcst
- [x] Agent: **LP-3e** productos + roadmap + closing copy
- [ ] Julio: **Copy design** → nuevo Make LP-3 con brief §4  
- [ ] Julio: export LP-3 Make → frame `marketing/lp/pilot-v3` + URL node hero
- [ ] Agent: pulir layout vía Figma MCP + capturas reales stg para overlays
