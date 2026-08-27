# Ops — Staging (`stg` / `stg.geoagro.ai`)

## Convención

| Ambiente | Git | Host | Notas |
|----------|-----|------|--------|
| Production | `main` | `https://geoagro.ai` (+ `www`, `agro-ai-cursor.vercel.app`) | LP waitlist + SEO indexable |
| Staging | `stg` | `https://stg.geoagro.ai` | Preview; `robots Disallow: /` |

## Flujo

1. Trabajar y pushear en `stg`.
2. Smoke en `https://stg.geoagro.ai`.
3. Promote: fast-forward `main` ← `stg` + push; apex ya adjunto a Production.

## Dominios (proyecto `agro-ai-cursor`)

| Host | gitBranch | Rol |
|------|-----------|-----|
| `geoagro.ai` | Production (`null`) | Apex prod |
| `www.geoagro.ai` | Production | Prefer redirect → apex |
| `stg.geoagro.ai` | `stg` | Staging |
| `agro-ai-cursor.vercel.app` | Production | Alias Vercel |

- Apex registrado en Vercel (team `raw-codes-projects`).
- Preview público: Vercel Authentication **off**.

## Clerk

Staging y prod Vercel siguen en instancia **Development** hasta cutover (ver [clerk-production-keys.md](clerk-production-keys.md)).
