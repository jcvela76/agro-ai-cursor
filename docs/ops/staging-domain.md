# Ops — Staging (`stg` / `stg.geoagro.ai`)

## Convención

| Ambiente | Git | Host | Notas |
|----------|-----|------|--------|
| Production | `main` | `agro-ai-cursor.vercel.app` (apex `geoagro.ai` solo tras promote) | Live; no pushear WIP de LP aquí |
| Staging | `stg` | `https://stg.geoagro.ai` | Único host de staging |

## Flujo

1. Trabajar y pushear en `stg`.
2. Smoke en `https://stg.geoagro.ai`.
3. Promote a `main` solo con OK explícito; entonces adjuntar apex `geoagro.ai` a Production.

## Dominio

- Apex `geoagro.ai` registrado en Vercel (team `raw-codes-projects`).
- Subdominio `stg.geoagro.ai` → proyecto `agro-ai-cursor`, git branch `stg`.
- Preview debe ser público: Vercel Authentication **off** en el proyecto (si está on, `stg.geoagro.ai` redirige a SSO de Vercel).

## Clerk

Staging y prod Vercel siguen en instancia **Development** hasta cutover post-LP (ver [clerk-production-keys.md](clerk-production-keys.md)).
