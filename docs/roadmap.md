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

## Fase 5k — Report-1 Informes Plus (HTML + PDF)

**Estado:** completada (2026-08-28)

- ADR-035: acciones en Clima / Agente / Trace; gate `weather_plus`; cuota mensual por plan
- Neon `generated_reports`; PDF server-side (Chromium); stub en test
- API `POST /api/reports/generate`, `GET /api/reports/quota`, `GET /api/reports/[id]/pdf`
- Preview `/reports/[id]`; UI `ReportExportAction`

## Fase 5l — Report-2 Briefing diario (ADR-036)

**Estado:** diseño aceptado (2026-08-28); implementación pendiente

- **2a:** `daily_briefing` parcela activa; 1/día org+parcela; cupo mensual aparte; snapshot + parent; UI Clima
- **2b:** programación diaria → email / WhatsApp — **email + cron hecho**; WhatsApp pendiente
- **2c:** tool agente `getParcelRecentBriefings`
- **Report-3 (backlog):** perfil agronómico de parcela vía preguntas del chat

Ver `docs/reports/discovery.md`.

## Fase 6 — Traceability discovery

**Estado:** Fase 6e (hygiene) completada (2026-08-27)

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

### Fase 6d — Trace-4 EUDR field catalog

- Catálogo piloto: país, productor, fin de producción, declaración deforestación + parcel link
- `evaluateEudrExportReadiness`; gate en `exported`
- UI create con campos EUDR; ADR-024; docs/traceability/eudr-field-catalog.md
- Tests 72+ total

### Fase 6e — Hygiene Lima Coffee

- Cleanup smoke parcels/lots (`db:cleanup:lima-smoke`)
- `PATCH /api/trace/lots/[lotId]` Completar EUDR en no-exportados
- Docs `hygiene-lima-coffee.md`

### Fase 6f — siguiente

- Ops / Review / billing según prioridad → **Fase 7 abierta**

## Fase 7 — Agronomic Review

**Estado:** Review-2 cerrada (Neon)

### Review-1 — Decision core (Fase 7a)

- Entitlement `agronomic_review`; gate `REVIEW_UNAVAILABLE`
- `ReviewDecision` append-only (`observe` \| `recommend` \| `decide`)
- `OfflineReviewDecisionRegistry` + fixtures; Neon diferido
- `GET|POST /api/review/decisions`; tab Revisión; ADR-025

### Review-2 — Neon persistence (Fase 7b)

- Tabla `review_decisions`; `NeonReviewDecisionRegistry` si `DATABASE_URL`
- Seed `db:seed:review`; ADR-026

### Hygiene Review — smoke cleanup

- `db:cleanup:review-smoke` (dry-run / `APPLY=1`)
- Conserva fixtures observe/recommend Lima Norte

## UI backlog

| Slice | Contenido |
|-------|-----------|
| LP marketing | **Live** en `geoagro.ai` (`main`); staging `stg.geoagro.ai` |
| Clerk prod keys | **Hecho 2026-08-27** — apex `pk_live_` / FAPI `clerk.geoagro.ai`; Preview/stg siguen `pk_test_`. Ver [ops/clerk-production-keys.md](ops/clerk-production-keys.md) |
| Billing-1 | **Hecho 2026-08-27** — Clerk Billing sandbox + webhook → entitlements; ops `docs/ops/billing.md` (ADR-030). Cobro live Production diferido |
| Billing-2 | **Hecho 2026-08-27** — UI admin/billing/cancel + smoke stg; Make `gQ0ta5…` portado |
| Billing-ops-docs | **Hecho 2026-08-27** — runbook CLI/webhook, `clerk-billing-manual.md`, scripts bootstrap |
| Miembros (piloto) | **Hecho 2026-08-27** — panel propio + límites por plan (UI); `plan-limits.ts` |
| SENAMHI-1 stub | **Hecho 2026-08-27** — `SenamhiStubWeatherSource` + gate `weather_plus`; `WEATHER_SOURCE=senamhi_stub`; live post contrato (ADR-031) |
| Billing-3 | **Hecho 2026-08-28** — `maxAllowedMemberships` sync + webhook revoca invitaciones sobre tope |
| Promote apex | **Hecho 2026-08-28** — `main` = `stg` @ `d6f31de`; deploy Production READY; smoke público OK |
| Promote apex | **Hecho 2026-08-28** — `main` = `stg` @ `42c2061`; Legal-1 + LP-claims en Production |
| Billing-ops-prod | **Hecho 2026-08-28** — script + runbook webhook Production; smoke member limits OK |
| Spectral-1 | **Hecho 2026-08-28** — NDRE/EVI/SAVI/MSAVI/GNDVI/NDWI/NDMI/NBR offline + tab Espectral + tool agente (ADR-033) |
| Spectral-2 | **Hecho 2026-08-28** — overlay sintético en mapa + selector índice + leyenda + opacidad |
| Spectral-3 stub | **Hecho 2026-08-28** — `SentinelHubStubSpectralSource` + discovery; `SPECTRAL_SOURCE=sentinel_hub_stub`; live post contrato (ADR-034) |
| **Siguiente** | Legal DRAFT → abogado; Billing live post-aprobación; Spectral live (Sentinel Hub / CDSE) |

## Docs por slice (canónico)

ADR si aplica, `session-log`, `roadmap`, `figma.md` si UI, `AGENTS`, **commit + push**.

## Gates transversales

| Gate | Cuándo |
|------|--------|
| Legal/Privacy | Antes de SENAMHI live, beta real o **cobro Billing live** (sandbox OK; ver checklist en ops/billing.md) |
| Agro Agent LLM en prod | Después de Plus gate tests |
| Remoto GitHub | `agro-ai-cursor` |
