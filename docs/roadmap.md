# Roadmap

Secuencia simplificada de entrega. Este documento es el plan activo.

## Fase 0–2 — Contexto, spec, arquitectura

**Estado:** completadas

## Fase 3 — Foundation

**Estado:** completada

- Next.js + TypeScript + Vitest + CI
- Remoto GitHub `jcvela76/agro-ai-cursor`
- Clerk + Neon + Vercel prod

## Fase 4 — Weather MVP (API)

**Estado:** completada (free live)

- Deny-before-provider + observation/forecast
- Open-Meteo + NASA POWER (`WEATHER_SOURCE=free`)
- Tests WA-01, WA-03..05, WA-07, WA-08

## Fase 5 — UI-1 Map shell + design system

**Estado:** completada (2026-08-26)

- Figma tokens/atoms + frames LP / map-shell / weather panel
- `/` LP gate pública; `/app` mapa MapLibre + panel Weather
- `GET /api/parcels` org-scoped (Parcel Core)
- Atoms en `src/ui/`

## Fase 6 — Traceability discovery

**Estado:** en curso (paralelo)

## Fase 7 — Agronomic Review

**Estado:** futuro

## UI backlog (post UI-1)

| Slice | Contenido |
|-------|-----------|
| UI-2 | Dibujar/editar geometría (GeoJSON + CRUD) |
| UI-3 | LP marketing completo + pricing/subscribe |
| UI-4 | Admin workspace (entitlements UI) |
| UI-5 | Panel Agro Agent (Plus + LLM) |

## Tracks paralelos

| Track | Estado |
|-------|--------|
| Agro Agent (eve scaffold) | Plus gate + `/api/agent/chat` scaffold; LLM pendiente |
| SENAMHI paid | Stub post gate legal |

## Gates transversales

| Gate | Cuándo |
|------|--------|
| Legal/Privacy | Antes de SENAMHI live o beta real |
| Agro Agent LLM en prod | Después de Plus gate tests |
| UI-2 draw | Después de schema geometría |
| Remoto GitHub | `agro-ai-cursor` |
