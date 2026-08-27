# Roadmap

Secuencia simplificada de entrega. Este documento es el plan activo.

## Fase 0–2 — Contexto, spec, arquitectura

**Estado:** completadas

## Fase 3 — Foundation

**Estado:** completada

## Fase 4 — Weather MVP (API)

**Estado:** completada (free live)

## Fase 5 — UI-1 Map shell + design system

**Estado:** completada (2026-08-26)

## Fase 5b — UI-2 Parcel draw

**Estado:** completada (2026-08-26)

- `parcels.geometry` JSONB + centroide lat/lon (ADR-011)
- Allowlist Weather opcional (vacío = todas las del org)
- CRUD `POST/PATCH/DELETE /api/parcels`
- terra-draw en `/app` (crear / editar vértices / eliminar)
- Tests: 19 passed

## Fase 6 — Traceability discovery

**Estado:** en curso (paralelo)

## Fase 7 — Agronomic Review

**Estado:** futuro

## UI backlog

| Slice | Contenido |
|-------|-----------|
| UI-3 | LP marketing completo + pricing/subscribe |
| UI-4 | Admin workspace (entitlements UI) |
| UI-5 | Panel Agro Agent (Plus + LLM) |

## Tracks paralelos

| Track | Estado |
|-------|--------|
| Agro Agent (eve scaffold) | Plus gate + `/api/agent/chat` scaffold; LLM pendiente |
| SENAMHI paid | Stub post gate legal |

## Docs por slice (canónico)

Al cerrar cada slice: ADR si aplica, `session-log`, `roadmap`, `figma.md` si UI, `AGENTS` pendientes, **commit + push**.

## Gates transversales

| Gate | Cuándo |
|------|--------|
| Legal/Privacy | Antes de SENAMHI live o beta real |
| Agro Agent LLM en prod | Después de Plus gate tests |
| Remoto GitHub | `agro-ai-cursor` |
