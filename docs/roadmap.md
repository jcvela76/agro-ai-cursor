# Roadmap

Secuencia simplificada de entrega. Este documento es el plan activo; no hay fases M0/M1/M2 ni packets de evidencia.

## Fase 0 — Contexto y límites

**Estado:** completada (bootstrap 2026-08-26)

- Product boundary definido
- Failure lessons documentadas
- ADR-001 a ADR-003 aceptadas

## Fase 1 — Especificación de producto

**Estado:** completada

- Charter Weather first-release
- Corpus WQ/WA
- Non-goals explícitos

## Fase 2 — Arquitectura y stack

**Estado:** completada (2026-08-26)

- ADR-004..008 cerradas (Next.js + Vercel + Clerk + proveedores + eve + Figma)
- Estructura modular monolith en `src/`

## Fase 3 — Foundation

**Estado:** en curso

- Next.js + TypeScript + Vitest + CI
- Remoto GitHub `agro-ai-cursor`
- Clerk middleware en `/api/*`

## Fase 4 — Weather MVP

**Estado:** en curso (slice offline)

- Parcelas sintéticas + deny-before-provider
- Endpoints observation/forecast offline
- Tests WA-01, WA-03..WA-05, WA-07
- Pendiente: adaptadores Open-Meteo / NASA POWER live

## Fase 5 — Traceability discovery

**Estado:** en curso (paralelo)

- `docs/traceability/discovery.md`
- Interfaces TypeScript sin runtime

## Fase 6 — Agronomic Review

**Estado:** futuro

## Tracks paralelos

| Track | Estado |
|-------|--------|
| Agro Agent (eve scaffold) | Plus gate + `/api/agent/chat` scaffold |
| Figma UX/UI | `docs/design/figma.md` — archivo pendiente MCP |
| Proveedores free live | Pendiente sesión 2 |

## Gates transversales

| Gate | Cuándo |
|------|--------|
| Legal/Privacy | Antes de SENAMHI live o beta real |
| Proveedor weather vivo | Después de offline + auth |
| Agro Agent LLM en prod | Después de Plus gate tests |
| UI en Next.js | Después de frames Figma aprobados |
| Remoto GitHub | `agro-ai-cursor` |
