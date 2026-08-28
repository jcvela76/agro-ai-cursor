# Feature smoke — plan QA

Checklist de estabilización funcional (antes de polish visual). Cada fase cierra con tests + smoke script + commit en `stg`.

## Fase 0 — Baseline

| Paso | Comando / acción | OK |
|------|------------------|-----|
| Unit tests | `npm test` | ☑ |
| Seed fixtures Neon | `npm run db:seed` (requiere `DATABASE_URL`) | ☐ manual |
| Env QA local/stg | `WEATHER_SOURCE=free`, `SPECTRAL_SOURCE=offline`, Clerk + Neon | ☑ ref |
| Org demo | Lima Coffee con `weather`, `weather_plus`, `traceability`, `agronomic_review` | ☑ fixtures |

## QA-1 — Parcel Core

| Check | Cómo |
|-------|------|
| List org parcels | `npm run smoke:parcels` → list |
| Create + geometry | smoke → create |
| Update name + geometry | smoke → patch |
| Delete | smoke → delete |
| Demo area ~4.8 ha | smoke → seed parcel area |
| API routes | `tests/api-parcels-route.test.ts` |
| Neon persistence | `SMOKE_NEON=1 npm run smoke:parcels` |

## QA-2 — Weather

| Check | Cómo |
|-------|------|
| Auth gates (unauth, entitlement, parcel, cross-org) | `npm run smoke:weather` |
| Observation + forecast offline | smoke → obs 22.4°C + forecast days |
| API routes | `tests/api-weather-route.test.ts` |
| Factory modes | `tests/weather-source-factory.test.ts` |
| SENAMHI paid gate | `SMOKE_SENAMHI=1 npm run smoke:weather` |

## QA-3 — Espectral

| Check | Cómo |
|-------|------|
| Plus gate (unauth, weather-only, cross-org) | `npm run smoke:spectral` |
| Indices 8 + NDRE + overlay grid | smoke → indices + overlay |
| API routes | `tests/api-spectral-route.test.ts` |
| Factory modes | `tests/spectral-source-factory.test.ts` |
| Sentinel Hub stub | `SMOKE_SENTINEL_STUB=1 npm run smoke:spectral` |
| Sentinel Hub live (CDSE) | `SMOKE_SENTINEL_LIVE=1 npm run smoke:spectral` (requiere `SENTINEL_CLIENT_*`) |

## QA-4 — Agente

| Check | Cómo |
|-------|------|
| Plus gate + 8 tools con parcelId fijo | `npm run smoke:agent` |
| Cross-org tool blocked | smoke → cross-org |
| API GET plusEnabled | `tests/api-agent-route.test.ts` |
| API POST gates (403/503/400) | `tests/api-agent-route.test.ts` |

## QA-5 — Trazabilidad

| Check | Cómo |
|-------|------|
| List + gates (unauth, no entitlement) | `npm run smoke:trace` |
| Create + PATCH EUDR + events + export | smoke → lifecycle |
| EUDR export blocked/ok | smoke → eudr_incomplete / export |
| API routes | `tests/api-trace-route.test.ts` |
| Registry factory | `tests/trace-lot-registry-factory.test.ts` |
| Neon persistence | `SMOKE_NEON=1 npm run smoke:trace` |
| EUDR-only (legacy) | `npm run smoke:trace-eudr` |

## QA-6 — Revisión

| Check | Cómo |
|-------|------|
| Gates (unauth, no entitlement) + list/append | `npm run smoke:review` |
| Cross-org parcel blocked | smoke → cross-org |
| API routes | `tests/api-review-route.test.ts` |
| Registry factory | `tests/review-registry-factory.test.ts` |
| Neon persistence | `SMOKE_NEON=1 npm run smoke:review` |

## QA-7 — Admin / billing

| Check | Cómo |
|-------|------|
| Billing sync + member limits + workspace | `npm run smoke:admin` |
| Workspace settings API | `tests/api-workspace-settings-route.test.ts` |
| Org invitations API | `tests/api-org-invitations-route.test.ts` |
| Billing/member unit tests | `tests/billing-entitlements.test.ts`, `tests/member-limit-enforcement.test.ts` |

## QA-8 — Regresión stg

| Check | Comando | OK |
|-------|---------|-----|
| Unit tests (197+) | `npm test` | ☑ |
| Lint | `npm run lint` | ☑ |
| Build producción | `npm run build` | ☑ |
| Smoke offline (8 scripts) | `npm run smoke:all` | ☑ |
| Smoke + stubs opcionales | `SMOKE_SENAMHI=1 SMOKE_SENTINEL_STUB=1 npm run smoke:all` | ☑ |
| Regresión one-shot | `npm run qa:regression` | ☑ |
| Neon persistence | `SMOKE_NEON=1 npm run smoke:all` (requiere `DATABASE_URL`) | ☐ manual |
| Seed Neon | `npm run db:seed` (+ trace/review seeds) | ☐ manual |
| E2E visual `/app` | Browser smoke Lima Coffee (post-polygon fix) | ☐ manual |
| Promote `stg` → `main` | Tras veredicto + billing/legal checklist | ☐ pendiente |

**Veredicto QA-8 (2026-08-28, rama `stg`, commit post-QA-7):** PASS offline — listo para polish visual y smoke manual en stg/Vercel antes de `main`.

### Comandos útiles

```bash
npm run qa:regression          # test + lint + smoke:all (con stubs)
npm run smoke:all              # solo smokes offline
SMOKE_NEON=1 npm run smoke:all # incluye Neon si DATABASE_URL está configurado
```
