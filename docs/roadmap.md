# Roadmap

Secuencia simplificada de entrega. Este documento es el plan activo.

## Fase 0–5c — Foundation → UI-3

**Estado:** completadas (ver historial session-log)

## Fase 5d — UI-4 Admin workspace

**Estado:** completada (2026-08-26)

- `/app/admin` solo `org:admin`
- `GET|PATCH /api/workspace/settings` → Clerk `publicMetadata`
- Entitlements + allowlist + OrganizationProfile
- ADR-013; Figma `app/admin/default`

## Fase 5e — UI-5 Agro Agent (Plus + LLM)

**Estado:** completada (2026-08-26); model auth → ADR-015 Gateway (2026-08-27)

- ADR-014: AI SDK `streamText` + tools observation/forecast; eve diferido
- ADR-015: Vercel AI Gateway (OIDC) en vez de `OPENAI_API_KEY` directa; re-evaluar
- `POST /api/agent/chat` Plus gate + stream; `GET` plusEnabled
- Panel Agente en `/app` (tab junto a Clima); WA-07 tests
- Figma `agent/chat/default` high-fi

## Fase 5f — Plus-1 Rainfall 30d (WQ-11)

**Estado:** completada (2026-08-27)

- Agregado determinístico lluvia 30d (NASA POWER / offline)
- Tool agent `getParcelRainfall30d`; ADR-016
- Tests WQ-11 (30 total)

## Fase 5g — Plus-2 Campaign comparison (WQ-12)

**Estado:** completada (2026-08-27)

- Comparación campaña YTD vs año anterior (NASA / offline)
- Tool agent `getParcelRainfallCampaignComparison`; ADR-017
- Tests 34 total

## Fase 5h — Plus-3 Low-rain days (WQ-13)

**Estado:** completada (2026-08-27)

- Ranking de días del horizonte por menor probabilidad de precipitación (Open-Meteo / offline)
- Tool agent `getParcelLowRainDays`; ADR-018; método `forecast-low-precip-probability/v1`
- Horizon forecast Open-Meteo ampliado a 7 días
- Tests 41 total

## Fase 5i — Plus-4 Growing degree days (WQ-14)

**Estado:** completada (2026-08-27)

- GDD campaña YTD: `(Tmax+Tmin)/2 − 10 °C` (NASA T2M_MAX/T2M_MIN / offline)
- Tool agent `getParcelGdd`; ADR-019; método `gdd-mean-base10-calendar-ytd/v1`
- Tests 48 total

## Fase 5j — Plus-5 Reference ET0 (WQ-15)

**Estado:** completada (2026-08-27)

- ET0 Hargreaves–Samani campaña YTD (NASA Tmax/Tmin + lat / offline)
- Tool agent `getParcelEt0`; ADR-020; método `et0-hargreaves-samani-calendar-ytd/v1`
- Tests 57 total

## Fase 6 — Traceability discovery

**Estado:** Fase 6c (Trace-3) completada (2026-08-27)

### Fase 6a — Trace-1 Lot Core

- Entitlement `traceability` + `authorizeTraceabilityAccess`
- Fixtures coffee + `OfflineTraceLotRegistry` + `ListOrgTraceLots`
- `GET /api/trace/lots`; tab Trazabilidad en `/app`
- ADR-021; WQ-17 sin agent tools
- Tests 63 total

### Fase 6b — Trace-2 Lot mutations

- `CreateOrgTraceLot` + `AppendOrgTraceEvent`
- `POST /api/trace/lots` + `POST /api/trace/lots/[lotId]/events`
- UI forms crear lote / añadir evento; ADR-022
- Persistencia en memoria (Neon diferido); EUDR diferido
- Tests 69 total

### Fase 6c — Trace-3 Neon persistence

- Tablas `trace_lots` / `trace_events` / `trace_parcel_links`
- `NeonTraceLotRegistry` cuando hay `DATABASE_URL`
- Seed coffee `db:seed:trace`; ADR-023
- EUDR diferido a Trace-4
- Tests 70 total

### Fase 6d — siguiente

- Catálogo de campos EUDR

## Fase 7 — Agronomic Review

**Estado:** futuro

## UI backlog

| Slice | Contenido |
|-------|-----------|
| Billing | Clerk Billing / Stripe post gate legal |

## Docs por slice (canónico)

ADR si aplica, `session-log`, `roadmap`, `figma.md` si UI, `AGENTS`, **commit + push**.

## Gates transversales

| Gate | Cuándo |
|------|--------|
| Legal/Privacy | Antes de SENAMHI live, beta real o billing |
| Agro Agent LLM en prod | Después de Plus gate tests |
| Remoto GitHub | `agro-ai-cursor` |
