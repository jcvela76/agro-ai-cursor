# Reportes — discovery (Report-1)

**Estado:** Report-1 en implementación  
**ADR:** ADR-035  
**Entitlement:** `weather_plus` (todos los informes)

## Decisiones de producto (2026-08-28)

| # | Decisión |
|---|----------|
| 1 | **Sin tab Informes.** Solo acciones contextuales en **Clima**, **Agente** y **Trace**. |
| 2 | **PDF server-side** desde el día 1 (HTML → Chromium → PDF). |
| 3 | **Plus obligatorio** para generar; sin Plus → aviso upsell a `/app/billing`. |
| 4 | **Persistencia** en Neon (`generated_reports`). |
| 5 | **Cuota mensual** por plan de suscripción (mes calendario `America/Lima`). |

## Cuotas por plan (piloto)

| Plan slug | Informes / mes |
|-----------|----------------|
| `free` / `free_org` | 0 (solo upsell) |
| `weather_plus` | 10 |
| `operations` | 30 |
| `full` | 50 |

Mapper: `src/domain/billing/plan-limits.ts` → `PLAN_REPORT_LIMITS`.

## Catálogo v1

| Tipo | Origen UI | Contenido |
|------|-----------|-----------|
| `weather_climate` | Clima | Obs + pronóstico 7d + GDD + ET0 + lluvia 30d |
| `water_balance` | Clima | Playbook hídrico (5 señales) + resumen WQ-18 |
| `agent_briefing` | Agente | Pregunta + respuesta markdown del turno |
| `trace_lot_dossier` | Trace | Lote coffee + EUDR + eventos + parcelLinks |

## Flujo

```text
Acción en panel → GET /api/reports/quota
  → sin Plus: upsell
  → con Plus y cuota: POST /api/reports/generate
  → HTML + PDF → Neon → preview /reports/[id] + download /api/reports/[id]/pdf
```

## Fuera de alcance (Report-1)

- Tab dedicada «Informes»
- Informes programados / email
- Branding por workspace
- Object storage (PDF en Postgres base64 por ahora)
