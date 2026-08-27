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

## Fase 5c — UI-3 Marketing LP

**Estado:** completada (2026-08-26)

- LP multi-sección en `/` (problema, Weather, productos, precios, CTA)
- Precios informativos; subscribe → Clerk Sign up (ADR-012, sin Stripe)
- Figma `marketing/lp/full`

## Fase 6 — Traceability discovery

**Estado:** en curso (paralelo)

## Fase 7 — Agronomic Review

**Estado:** futuro

## UI backlog

| Slice | Contenido |
|-------|-----------|
| UI-4 | Admin workspace (entitlements UI) |
| UI-5 | Panel Agro Agent (Plus + LLM) |
| Billing | Clerk Billing / Stripe post gate legal |

## Docs por slice (canónico)

Al cerrar cada slice: ADR si aplica, `session-log`, `roadmap`, `figma.md` si UI, `AGENTS` pendientes, **commit + push**.

## Gates transversales

| Gate | Cuándo |
|------|--------|
| Legal/Privacy | Antes de SENAMHI live, beta real o billing |
| Agro Agent LLM en prod | Después de Plus gate tests |
| Remoto GitHub | `agro-ai-cursor` |
