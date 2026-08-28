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

## Spectral (CDSE live — Preview only)

| Variable | Preview (`stg`) | Production |
|----------|-----------------|------------|
| `SPECTRAL_SOURCE` | `sentinel_hub` | offline / TBD post ToS (ADR-038) |
| `SENTINEL_CLIENT_ID` | OAuth CDSE (secret) | — |
| `SENTINEL_CLIENT_SECRET` | OAuth CDSE (secret) | — |

Tras cambiar env: redeploy Preview de `stg` (push o `npx vercel redeploy`).

## Clerk

Staging (Preview) sigue en instancia Clerk **Development** (`pk_test_`). Production apex usa **Production** (`pk_live_`, FAPI `clerk.geoagro.ai`). Ver [clerk-production-keys.md](clerk-production-keys.md).

**Invitaciones org:** el enlace de aceptación debe apuntar al dominio correcto, no al alias Vercel genérico.

| Vercel env | `NEXT_PUBLIC_APP_URL` |
|------------|------------------------|
| Preview (`stg`) | `https://stg.geoagro.ai` |
| Production | `https://geoagro.ai` |

La app envía invitaciones vía `POST /api/org/invitations` con `redirectUrl` → `{APP_URL}/accept-invitation`. Esa página consume `__clerk_ticket` y redirige a `/app`.

**Dos causas del redirect a `agro-ai-cursor.vercel.app`:**

1. **`redirectUrl` al crear la invitación** — resuelto en código (`app-url.ts`: host del request, rama `stg`, luego env).
2. **`__clerk_db_jwt` tras aceptar** — Clerk Development sincroniza sesión contra `development_origin` de la instancia. Debe ser `https://stg.geoagro.ai`, no el alias Vercel.

```bash
./scripts/clerk-development-origin-stg.sh
```

| Vercel env | `NEXT_PUBLIC_APP_URL` |
|------------|------------------------|
| Preview (`stg`) | `https://stg.geoagro.ai` |
| Production | `https://geoagro.ai` |

Tras cambiar origen o env: **revocar invitaciones pendientes** y reenviar desde `/app/admin` (el `redirect_url` queda fijado al crear la invitación).
