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

## Fase 6 — Traceability discovery

**Estado:** en curso (paralelo)

## Fase 7 — Agronomic Review

**Estado:** futuro

## UI backlog

| Slice | Contenido |
|-------|-----------|
| UI-5 | Panel Agro Agent (Plus + LLM) |
| Billing | Clerk Billing / Stripe post gate legal |

## Docs por slice (canónico)

ADR si aplica, `session-log`, `roadmap`, `figma.md` si UI, `AGENTS`, **commit + push**.

## Gates transversales

| Gate | Cuándo |
|------|--------|
| Legal/Privacy | Antes de SENAMHI live, beta real o billing |
| Agro Agent LLM en prod | Después de Plus gate tests |
| Remoto GitHub | `agro-ai-cursor` |
