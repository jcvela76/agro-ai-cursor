# Reportes — discovery

**ADR:** ADR-035 (Report-1), ADR-036 (Report-2 daily briefing)  
**Entitlement:** `weather_plus`

## Report-1 (hecho)

| # | Decisión |
|---|----------|
| 1 | Sin tab Informes. Acciones en **Clima**, **Agente**, **Trace**. |
| 2 | PDF server-side (HTML → Chromium). |
| 3 | Plus obligatorio; sin Plus → upsell `/app/billing`. |
| 4 | Persistencia Neon `generated_reports`. |
| 5 | Cuota mensual puntual por plan (`PLAN_REPORT_LIMITS`). |

### Catálogo v1 (puntuales)

| Tipo | Origen |
|------|--------|
| `weather_climate` | Clima |
| `water_balance` | Clima |
| `agent_briefing` | Agente |
| `trace_lot_dossier` | Trace |

### Cuota puntual / mes (`America/Lima`)

| Plan | Informes puntuales / mes |
|------|--------------------------|
| free | 0 |
| weather_plus | 10 |
| operations | 30 |
| full | 50 |

---

## Report-2 — Briefing diario (ADR-036)

### Decisiones cerradas (2026-08-28)

| # | Decisión |
|---|----------|
| 1 | Scope = **parcela activa** (no org-wide en v1). |
| 2 | Cadencia = **1 / día / (org + parcela)** (`America/Lima`). |
| 3 | Cupo **aparte** de la cuota puntual, dimensionado por plan (ver tabla). |
| 4 | Entrega: botón manual + opción **programar diario** → email y/o WhatsApp. |
| 5 | Agro Agent **lee** briefings recientes vía tool para enriquecer respuestas. |

### Cupo de briefings diarios (propuesta piloto)

Distinct from `PLAN_REPORT_LIMITS` (puntuales). Contador = briefings `daily_briefing` con `status=ready` en el mes Lima.

| Plan | Briefings diarios / mes | Notas |
|------|-------------------------|--------|
| free | 0 | Upsell |
| weather_plus | **20** | ~20 días/mes en 1 parcela, o menos días en varias |
| operations | **60** | ~2 parcelas × 30 días, o 1 parcela + margen |
| full | **120** | Más parcelas o margen |

Reglas:

- Generar hoy en parcela X bloquea **re-generar** esa parcela hoy (unique), aunque quede cupo mensual.
- Fallo técnico (`failed`) **no** consume cupo ni el slot del día.
- Si cupo mensual agotado → 429 + CTA billing; el slot diario sigue “disponible” mañana si hay cupo.

Ajustar números en `PLAN_DAILY_BRIEFING_LIMITS` tras uso real.

### Cadencia y unicidad

```text
UNIQUE (org_id, parcel_id, report_type='daily_briefing', report_day)
report_day = YYYY-MM-DD America/Lima
```

UI si ya existe: “Ya generado hoy · Ver informe”.

### Memoria entre días

```text
parent_report_id → briefing anterior
context_snapshot (jsonb) → señales + sugerencias + openQuestions (compacto para LLM)
```

Día N+1: carga último `ready` (≤7 días); si no hay → briefing “día 1” sin Delta.

### Contenido

1. Resumen del día  
2. Delta vs ayer (si hay snapshot)  
3. Tablas (clima / hídrico / espectral según tools)  
4. Sugerencias agente (WQ-18)  
5. Límites + decisión agrónomo  

Números = use cases; prosa/delta = LLM.

### Entrega programada (Report-2b)

| Canal | Notas |
|-------|--------|
| Email | Destinatarios workspace (admin configura); Resend/Clerk/email provider TBD |
| WhatsApp | Opt-in explícito; proveedor (Twilio / Meta Cloud API) TBD; compliance |

Preferencias por org (o por parcela):

- `dailyBriefingEnabled: boolean`
- `channels: ("email" \| "whatsapp")[]`
- `sendAtLocal: "06:00"` (Lima)
- `parcelIds: string[]` (subconjunto; default = activas con Plus)

Cron (Vercel Cron / Workflow) → genera si no existe briefing de hoy → envía link preview + PDF.

### Agent tool (Report-2a/c)

`getParcelRecentBriefings({ parcelId, days?: 3 })` → snapshots recientes (no PDF crudo).

Instrucciones: ante riego/labores/clima, consultar briefings de los últimos días si existen; citar `report_day`.

### UI

- Clima / Agente: “Generar briefing diario” + estado hoy / cupo  
- Toggle “Enviar cada mañana” (settings workspace o panel Clima) → Report-2b  
- Sin tab Informes (sigue ADR-035)

---

## Report-3 (backlog) — Perfil agronómico de parcela

El chat sugiere preguntas para enriquecer contexto de parcela (persistido, no solo sesión):

Ejemplos:

- ¿Cada cuánto riegas esta parcela?  
- ¿Qué cultivo / variedad?  
- ¿Fecha de siembra / etapa fenológica?  
- ¿Sistema de riego?  
- ¿Última aplicación / cosecha esperada?

Almacenar en `parcel_agronomic_profile` (org + parcel scoped). Agent tools: `getParcelProfile` / `updateParcelProfile` (con confirmación humana).

Usar perfil + briefings para ajustar orientación (sigue WQ-18: no órdenes imperativas).

**No implementar en Report-2a.**

---

## Slices sugeridos

| Slice | Entrega |
|-------|---------|
| **Report-2a** | Tipo `daily_briefing`; unique día; cupo mensual aparte; snapshot + parent; UI Clima; PDF |
| **Report-2b** | Preferencias envío; cron; email (WhatsApp después) — **implementado** (email + cron; WA pendiente) |
| **Report-2c** | Tool `getParcelRecentBriefings` + prompt |
| **Report-3** | Perfil parcela + preguntas guiadas en chat |
